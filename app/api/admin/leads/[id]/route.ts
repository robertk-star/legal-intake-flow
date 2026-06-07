import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { sendLeadAssignedNotifications } from "@/lib/emailNotifications";
import { sendPartnerLeadWebhook } from "@/lib/partnerIntegrations";

const VALID_STATUSES = [
  "new", "reviewing", "ready_to_assign", "assigned", "closed", "rejected", "spam",
] as const;
type LeadStatus = typeof VALID_STATUSES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * GET /api/admin/leads/[id]
 *
 * Returns the full lead record including medical_summary, additional_notes,
 * internal_review_notes, raw_payload, partner response fields, and assignment info.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  return NextResponse.json({ success: true, data });
}

/**
 * PATCH /api/admin/leads/[id]
 *
 * Allows admin to update:
 *   - status
 *   - internal_review_notes
 *   - assigned_partner_account_id (manual assignment only)
 *
 * If assignment changes, partner response workflow fields are reset so notes/status
 * from a prior partner do not carry over to the newly assigned firm.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  let assignmentEvent: {
    partnerAccountId: string;
    previousPartnerAccountId: string | null;
    assignmentType: "manual" | "reassignment";
    notes: string;
  } | null = null;

  // ── Status ────────────────────────────────────────────────────────────────
  if ("status" in body) {
    const status = String(body.status ?? "").trim() as LeadStatus;
    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed values: ${VALID_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    updates.status = status;
  }

  // ── Internal review notes ─────────────────────────────────────────────────
  if ("internal_review_notes" in body) {
    const notes = String(body.internal_review_notes ?? "").trim();
    updates.internal_review_notes = notes || null;
  }

  // ── Partner assignment ────────────────────────────────────────────────────
  if ("assigned_partner_account_id" in body) {
    const { data: currentLead, error: currentLeadError } = await supabaseAdmin
      .from("leads")
      .select("id, source, assigned_partner_account_id, consent_given, dbs_consent_given")
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (currentLeadError || !currentLead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const partnerId = body.assigned_partner_account_id;
    const currentPartnerId = currentLead.assigned_partner_account_id as string | null;
    const isDbsLead = currentLead.source === "disabilitybenefitsscreening";
    const hasDbsConsent = currentLead.dbs_consent_given === true || currentLead.consent_given === true;

    if (partnerId === null || partnerId === "") {
      if (currentPartnerId !== null) {
        updates.assigned_partner_account_id = null;
        updates.assigned_at = null;
        updates.partner_response_status = null;
        updates.partner_response_updated_at = null;
        updates.partner_viewed_at = null;
        updates.partner_notes = null;
      }
    } else {
      if (isDbsLead && !hasDbsConsent) {
        return NextResponse.json(
          { error: "This DBS lead cannot be assigned because consent is missing or was not preserved in LIF." },
          { status: 422 }
        );
      }

      const nextPartnerId = String(partnerId);

      // Verify the partner account exists and is active enough to receive assignments.
      const { data: partner, error: partnerError } = await supabaseAdmin
        .from("partner_accounts")
        .select("id, status")
        .eq("id", nextPartnerId)
        .single();

      if (partnerError || !partner) {
        return NextResponse.json(
          { error: "Partner account not found." },
          { status: 404 }
        );
      }

      if (partner.status !== "active" && partner.status !== "pending") {
        return NextResponse.json(
          { error: "Partner account must be active or pending before assignment." },
          { status: 422 }
        );
      }

      updates.assigned_partner_account_id = nextPartnerId;

      if (currentPartnerId !== nextPartnerId) {
        updates.assigned_at = new Date().toISOString();
        updates.partner_response_status = "new";
        updates.partner_response_updated_at = null;
        updates.partner_viewed_at = null;
        updates.partner_notes = null;
        assignmentEvent = {
          partnerAccountId: nextPartnerId,
          previousPartnerAccountId: currentPartnerId,
          assignmentType: currentPartnerId ? "reassignment" : "manual",
          notes: currentPartnerId ? "Manual admin reassignment." : "Manual admin assignment.",
        };
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update." },
      { status: 422 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from("leads")
    .update(updates)
    .eq("id", id)
    .is("deleted_at", null)
    .select(
      "id, status, internal_review_notes, assigned_partner_account_id, assigned_at, " +
      "partner_response_status, partner_response_updated_at, partner_viewed_at, partner_notes, updated_at"
    )
    .single();

  if (error || !data) {
    console.error("[PATCH /api/admin/leads/[id]] Update error:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }

  let notificationSummary = null;

  if (assignmentEvent) {
    const { error: eventError } = await supabaseAdmin
      .from("lead_assignment_events")
      .insert({
        lead_id: id,
        partner_account_id: assignmentEvent.partnerAccountId,
        previous_partner_account_id: assignmentEvent.previousPartnerAccountId,
        assignment_type: assignmentEvent.assignmentType,
        assigned_by: "admin",
        notes: assignmentEvent.notes,
      });

    if (eventError) {
      // The lead update succeeded; surface only in logs so the admin workflow is not blocked.
      console.error("[PATCH /api/admin/leads/[id]] Assignment event insert error:", eventError);
    }

    notificationSummary = await sendLeadAssignedNotifications({
      origin: (process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin),
      leadId: id,
      partnerAccountId: assignmentEvent.partnerAccountId,
      assignmentType: assignmentEvent.assignmentType,
    });

    const webhookSummary = await sendPartnerLeadWebhook({
      leadId: id,
      partnerAccountId: assignmentEvent.partnerAccountId,
      eventType: assignmentEvent.assignmentType === "reassignment" ? "lead.reassigned" : "lead.assigned",
    });

    notificationSummary = {
      ...(notificationSummary ?? {}),
      webhook: webhookSummary,
    };
  }

  return NextResponse.json({ success: true, data, notifications: notificationSummary });
}

/**
 * DELETE /api/admin/leads/[id]
 *
 * Soft-deletes a lead from active LIF workflows and resets the DBS duplicate key
 * by moving the current external_reference_id into original_external_reference_id.
 * This allows DBS to send the same stable external reference again later without
 * being blocked by LIF duplicate detection.
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const deletionReason = String(body.deletion_reason ?? "").trim() || "Admin deleted lead and reset duplicate key.";

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, source, external_reference_id, dbs_report_number, deleted_at")
    .eq("id", id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const currentLead = lead as {
    id: string;
    source: string | null;
    external_reference_id: string | null;
    dbs_report_number: string | null;
    deleted_at: string | null;
  };

  if (currentLead.deleted_at) {
    return NextResponse.json({ error: "Lead is already deleted." }, { status: 409 });
  }

  const deletedAt = new Date().toISOString();
  const originalExternalReferenceId = currentLead.external_reference_id;
  const resetExternalReferenceId = originalExternalReferenceId
    ? `deleted:${id}:${Date.now()}`
    : null;

  const { data: deletedLead, error: deleteError } = await supabaseAdmin
    .from("leads")
    .update({
      deleted_at: deletedAt,
      deleted_by: "admin",
      deletion_reason: deletionReason,
      original_external_reference_id: originalExternalReferenceId,
      original_dbs_report_number: currentLead.dbs_report_number,
      external_reference_id: resetExternalReferenceId,
      dbs_report_number: null,
      assigned_partner_account_id: null,
      assigned_at: null,
      partner_response_status: null,
      partner_response_updated_at: null,
      partner_viewed_at: null,
      partner_notes: null,
      status: "closed",
    })
    .eq("id", id)
    .is("deleted_at", null)
    .select("id, deleted_at, original_external_reference_id, external_reference_id")
    .single();

  if (deleteError || !deletedLead) {
    console.error("[DELETE /api/admin/leads/[id]] Delete/reset error:", deleteError);
    return NextResponse.json({ error: "Failed to delete lead and reset duplicate key." }, { status: 500 });
  }

  const { error: eventError } = await supabaseAdmin
    .from("lead_deletion_events")
    .insert({
      lead_id: id,
      deleted_by: "admin",
      deletion_reason: deletionReason,
      original_source: currentLead.source,
      original_external_reference_id: originalExternalReferenceId,
      reset_external_reference_id: resetExternalReferenceId,
      original_dbs_report_number: currentLead.dbs_report_number,
    });

  if (eventError) {
    console.error("[DELETE /api/admin/leads/[id]] Delete audit insert error:", eventError);
  }

  return NextResponse.json({
    success: true,
    deleted: true,
    leadId: id,
    originalExternalReferenceId,
    resetExternalReferenceId,
  });
}
