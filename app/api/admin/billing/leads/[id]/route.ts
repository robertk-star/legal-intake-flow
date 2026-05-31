import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_BILLABLE_STATUSES = [
  "not_reviewed",
  "review_needed",
  "not_billable",
  "billable",
  "invoiced",
  "waived",
  "disputed",
] as const;

type BillableStatus = typeof VALID_BILLABLE_STATUSES[number];

type RouteContext = { params: Promise<{ id: string }> };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseAmountCents(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) return undefined;
    return Math.round(value);
  }
  if (typeof value === "string") {
    const normalized = value.trim().replace(/[$,]/g, "");
    if (!normalized) return null;
    const dollars = Number(normalized);
    if (!Number.isFinite(dollars) || dollars < 0) return undefined;
    return Math.round(dollars * 100);
  }
  return undefined;
}

function eventTypeForStatus(status: BillableStatus | undefined, amountChanged: boolean, notesChanged: boolean) {
  if (status === "invoiced") return "invoice_marked";
  if (status === "waived") return "waived";
  if (status === "disputed") return "disputed";
  if (status) return "status_update";
  if (amountChanged) return "amount_update";
  if (notesChanged) return "notes_update";
  return "billing_review";
}

/**
 * PATCH /api/admin/billing/leads/[id]
 *
 * Updates admin-reviewed billing readiness fields. This does not charge a card,
 * create a Stripe invoice, or send an invoice email.
 */
export async function PATCH(request: Request, { params }: RouteContext) {
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

  const { data: current, error: currentError } = await supabaseAdmin
    .from("leads")
    .select(
      "id, assigned_partner_account_id, billable_status, billing_amount_cents, billing_notes, " +
      "partner_response_status, first_name, last_name"
    )
    .eq("id", id)
    .single();

  if (currentError || !current) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const currentLead = current as unknown as {
    id: string;
    assigned_partner_account_id: string | null;
    billable_status: BillableStatus;
    billing_amount_cents: number | null;
    billing_notes: string | null;
  };

  const updates: Record<string, unknown> = {};
  let nextStatus: BillableStatus | undefined;
  let nextAmount: number | null | undefined;
  let nextNotes: string | null | undefined;

  if ("billable_status" in body) {
    const status = String(body.billable_status ?? "").trim() as BillableStatus;
    if (!VALID_BILLABLE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid billable status. Allowed values: ${VALID_BILLABLE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    nextStatus = status;
    updates.billable_status = status;
  }

  if ("billing_amount_cents" in body) {
    nextAmount = parseAmountCents(body.billing_amount_cents);
    if (nextAmount === undefined) {
      return NextResponse.json({ error: "Billing amount must be a non-negative number." }, { status: 422 });
    }
    updates.billing_amount_cents = nextAmount;
  } else if ("billing_amount" in body) {
    nextAmount = parseAmountCents(body.billing_amount);
    if (nextAmount === undefined) {
      return NextResponse.json({ error: "Billing amount must be a non-negative number." }, { status: 422 });
    }
    updates.billing_amount_cents = nextAmount;
  }

  if ("billing_notes" in body) {
    const notes = String(body.billing_notes ?? "").trim();
    nextNotes = notes || null;
    updates.billing_notes = nextNotes;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid billing fields to update." }, { status: 422 });
  }

  updates.billing_reviewed_at = new Date().toISOString();
  updates.billing_updated_at = new Date().toISOString();
  updates.billing_reviewed_by = "admin";

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select(
      "id, created_at, source, external_reference_id, first_name, last_name, state, benefit_type, " +
      "application_status, status, assigned_partner_account_id, assigned_at, partner_response_status, " +
      "partner_response_updated_at, billable_status, billing_amount_cents, billing_notes, " +
      "billing_reviewed_at, billing_updated_at"
    )
    .single();

  if (updateError || !updated) {
    console.error("[PATCH /api/admin/billing/leads/[id]] Update error:", updateError);
    return NextResponse.json({ error: "Failed to update billing fields. Confirm section13 SQL has been run." }, { status: 500 });
  }

  const amountChanged = nextAmount !== undefined && nextAmount !== currentLead.billing_amount_cents;
  const notesChanged = nextNotes !== undefined && nextNotes !== currentLead.billing_notes;

  const { error: eventError } = await supabaseAdmin
    .from("lead_billing_events")
    .insert({
      lead_id: id,
      partner_account_id: currentLead.assigned_partner_account_id,
      event_type: eventTypeForStatus(nextStatus, amountChanged, notesChanged),
      previous_billable_status: currentLead.billable_status,
      next_billable_status: nextStatus ?? currentLead.billable_status,
      previous_amount_cents: currentLead.billing_amount_cents,
      next_amount_cents: nextAmount === undefined ? currentLead.billing_amount_cents : nextAmount,
      notes: nextNotes === undefined ? null : nextNotes,
      created_by: "admin",
    });

  if (eventError) {
    console.error("[PATCH /api/admin/billing/leads/[id]] Billing event error:", eventError);
  }

  return NextResponse.json({ success: true, data: updated, warning: eventError ? "Billing update saved, but audit event failed." : null });
}
