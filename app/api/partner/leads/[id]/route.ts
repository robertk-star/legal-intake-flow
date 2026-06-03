import { NextResponse } from "next/server";
import { getAuthenticatedPartnerSession } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_PARTNER_RESPONSE_STATUSES = [
  "new",
  "reviewing",
  "contact_attempted",
  "contacted",
  "accepted",
  "declined",
  "retained",
  "closed",
] as const;

type PartnerResponseStatus = typeof VALID_PARTNER_RESPONSE_STATUSES[number];

const DETAIL_SELECT =
  "id, created_at, updated_at, source, external_reference_id, " +
  "first_name, last_name, phone, email, city, state, zip, " +
  "benefit_type, application_status, medical_summary, additional_notes, " +
  "status, assigned_partner_account_id, assigned_at, partner_response_status, " +
  "partner_response_updated_at, partner_viewed_at, partner_notes";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/**
 * GET /api/partner/leads/[id]
 *
 * Returns a single lead only if it is assigned to the authenticated partner account.
 * Also records partner_viewed_at the first time a partner opens the lead.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  const { data, error } = await supabaseAdmin
    .from("leads")
    .select(DETAIL_SELECT)
    .eq("id", id)
    .eq("assigned_partner_account_id", session.partnerAccountId)
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const lead = data as { partner_viewed_at?: string | null };
  let responseData: unknown = data;

  if (!lead.partner_viewed_at) {
    const viewedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ partner_viewed_at: viewedAt })
      .eq("id", id)
      .eq("assigned_partner_account_id", session.partnerAccountId)
      .is("deleted_at", null)
      .select(DETAIL_SELECT)
      .single();

    if (!updateError && updated) {
      responseData = updated;
    }
  }

  return NextResponse.json({ success: true, data: responseData });
}

/**
 * PATCH /api/partner/leads/[id]
 *
 * Allows non-viewer partner users to update partner_response_status and partner_notes
 * for leads assigned to their partner account.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (session.role === "viewer") {
    return NextResponse.json(
      { error: "Viewer users can view leads but cannot update lead status or notes." },
      { status: 403 }
    );
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

  if ("partner_response_status" in body) {
    const status = String(body.partner_response_status ?? "").trim() as PartnerResponseStatus;
    if (!VALID_PARTNER_RESPONSE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid partner response status. Allowed values: ${VALID_PARTNER_RESPONSE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }
    updates.partner_response_status = status;
    updates.partner_response_updated_at = new Date().toISOString();
  }

  if ("partner_notes" in body) {
    const notes = String(body.partner_notes ?? "").trim();
    updates.partner_notes = notes || null;
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
    .eq("assigned_partner_account_id", session.partnerAccountId)
    .is("deleted_at", null)
    .select(DETAIL_SELECT)
    .single();

  if (error || !data) {
    console.error("[PATCH /api/partner/leads/[id]] Update error:", error);
    return NextResponse.json({ error: "Failed to update lead." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}
