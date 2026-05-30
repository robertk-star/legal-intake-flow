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

/**
 * GET /api/partner/leads
 *
 * Returns leads assigned to the authenticated partner account only.
 * Optional query params:
 *   ?search=<text>                    — name, email, phone, state, external ref
 *   ?partner_response_status=<status> — partner-side status filter
 *   ?limit=<n>                        — default 100, max 200
 */
export async function GET(request: Request) {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search")?.trim() ?? "";
  const statusFilter = searchParams.get("partner_response_status")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  let query = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, updated_at, source, external_reference_id, " +
      "first_name, last_name, phone, email, city, state, zip, " +
      "benefit_type, application_status, medical_summary, additional_notes, " +
      "status, assigned_partner_account_id, assigned_at, partner_response_status, " +
      "partner_response_updated_at, partner_viewed_at"
    )
    .eq("assigned_partner_account_id", session.partnerAccountId)
    .order("assigned_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter) {
    if (!VALID_PARTNER_RESPONSE_STATUSES.includes(statusFilter as PartnerResponseStatus)) {
      return NextResponse.json(
        { error: `Invalid partner response status. Allowed values: ${VALID_PARTNER_RESPONSE_STATUSES.join(", ")}.` },
        { status: 422 }
      );
    }

    if (statusFilter === "new") {
      query = query.or("partner_response_status.is.null,partner_response_status.eq.new");
    } else {
      query = query.eq("partner_response_status", statusFilter);
    }
  }

  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,` +
      `email.ilike.%${search}%,phone.ilike.%${search}%,` +
      `state.ilike.%${search}%,external_reference_id.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/partner/leads] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch assigned leads." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
