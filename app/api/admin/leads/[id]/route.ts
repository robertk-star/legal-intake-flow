import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = [
  "new", "reviewing", "ready_to_assign", "assigned", "closed", "rejected", "spam",
] as const;
type LeadStatus = typeof VALID_STATUSES[number];

/**
 * GET /api/admin/leads/[id]
 *
 * Returns the full lead record including medical_summary, additional_notes,
 * internal_review_notes, raw_payload, and assigned partner info.
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
 *   - assigned_partner_account_id (set to null to unassign)
 *
 * No automatic routing. No email sending. Manual assignment only.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

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
    const partnerId = body.assigned_partner_account_id;
    if (partnerId === null || partnerId === "") {
      updates.assigned_partner_account_id = null;
      updates.assigned_at = null;
    } else {
      // Verify the partner account exists
      const { data: partner, error: partnerError } = await supabaseAdmin
        .from("partner_accounts")
        .select("id")
        .eq("id", String(partnerId))
        .single();

      if (partnerError || !partner) {
        return NextResponse.json(
          { error: "Partner account not found." },
          { status: 404 }
        );
      }
      updates.assigned_partner_account_id = String(partnerId);
      updates.assigned_at = new Date().toISOString();
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
    .select(
      "id, status, internal_review_notes, assigned_partner_account_id, assigned_at, updated_at"
    )
    .single();

  if (error || !data) {
    console.error("[PATCH /api/admin/leads/[id]] Update error:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
