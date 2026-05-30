import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/leads
 *
 * Returns a paginated list of DBS-ingested leads for the admin lead queue.
 *
 * Query params:
 *   ?search=<text>          — ilike on first_name, last_name, email, phone, external_reference_id
 *   ?state=<abbr>           — exact match on state
 *   ?benefit_type=<type>    — exact match on benefit_type
 *   ?status=<status>        — exact match on status
 *   ?assigned=true|false    — filter by whether assigned_partner_account_id is set
 *   ?limit=<n>              — max results (default 50, max 200)
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search         = searchParams.get("search")?.trim() ?? "";
  const stateFilter    = searchParams.get("state")?.trim().toUpperCase() ?? "";
  const benefitFilter  = searchParams.get("benefit_type")?.trim() ?? "";
  const statusFilter   = searchParams.get("status")?.trim() ?? "";
  const assignedFilter = searchParams.get("assigned")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);

  let query = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, updated_at, source, external_reference_id, " +
      "first_name, last_name, phone, email, city, state, zip, " +
      "benefit_type, application_status, status, " +
      "assigned_partner_account_id, assigned_at, partner_response_status, partner_response_updated_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Search across name, email, phone, external_reference_id
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,` +
      `email.ilike.%${search}%,phone.ilike.%${search}%,` +
      `external_reference_id.ilike.%${search}%`
    );
  }

  // Exact filters
  if (stateFilter)   query = query.eq("state", stateFilter);
  if (benefitFilter) query = query.eq("benefit_type", benefitFilter);
  if (statusFilter)  query = query.eq("status", statusFilter);

  // Assigned / unassigned filter
  if (assignedFilter === "true") {
    query = query.not("assigned_partner_account_id", "is", null);
  } else if (assignedFilter === "false") {
    query = query.is("assigned_partner_account_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/admin/leads] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch leads." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
