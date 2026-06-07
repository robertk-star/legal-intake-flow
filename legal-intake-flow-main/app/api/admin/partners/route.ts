import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/partners
 *
 * Returns a list of partner accounts.
 * Supports:
 *   ?search=<text>          — searches firm_name, contact_first_name, contact_last_name, email
 *   ?status=<value>         — filter by account status (active|inactive|pending|suspended)
 *   ?lead_status=<value>    — filter by lead_status (active|paused|at_capacity)
 *   ?accepting_leads=<bool> — filter by accepting_leads (true|false)
 *   ?limit=<n>              — max results (default 100, max 200)
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search         = searchParams.get("search")?.trim() ?? "";
  const statusFilter   = searchParams.get("status")?.trim() ?? "";
  const leadStatus     = searchParams.get("lead_status")?.trim() ?? "";
  const acceptingLeads = searchParams.get("accepting_leads")?.trim() ?? "";
  const limit          = Math.min(parseInt(searchParams.get("limit") ?? "100", 10) || 100, 200);

  let query = supabaseAdmin
    .from("partner_accounts")
    .select(`
      id,
      firm_name,
      contact_first_name,
      contact_last_name,
      email,
      phone,
      website,
      states_served,
      practice_area,
      monthly_lead_capacity,
      routing_scope,
      routing_states,
      routing_excluded_states,
      profile_updated_at,
      billing_contact_name,
      billing_contact_email,
      billing_contact_phone,
      billing_address_line1,
      billing_address_line2,
      billing_city,
      billing_state,
      billing_zip,
      billing_notes,
      status,
      accepting_leads,
      lead_status,
      accepted_case_types,
      accepted_languages,
      accepts_initial_filings,
      accepts_appeals,
      accepts_hearings,
      accepts_child_cases,
      lead_notes,
      last_login_at,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (search) {
    query = query.or(
      `firm_name.ilike.%${search}%,contact_first_name.ilike.%${search}%,contact_last_name.ilike.%${search}%,email.ilike.%${search}%`
    );
  }

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  if (leadStatus) {
    query = query.eq("lead_status", leadStatus);
  }

  if (acceptingLeads === "true") {
    query = query.eq("accepting_leads", true);
  } else if (acceptingLeads === "false") {
    query = query.eq("accepting_leads", false);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/admin/partners] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch partner accounts." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
