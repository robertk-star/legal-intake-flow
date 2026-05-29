import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = ["new", "reviewed", "contacted", "approved", "declined"] as const;
type Status = (typeof VALID_STATUSES)[number];

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 100);

  let query = supabaseAdmin
    .from("partner_access_requests")
    .select(
      "id, created_at, updated_at, first_name, last_name, firm_name, email, phone, website, states_served, practice_area, monthly_lead_capacity, message, internal_notes, status, source"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  // Status filter
  if (status && VALID_STATUSES.includes(status as Status)) {
    query = query.eq("status", status);
  }

  // Search filter — match against name, firm, email, phone, states
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,firm_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,states_served.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("[admin/partner-requests GET]", error.message);
    return NextResponse.json({ error: "Failed to fetch requests." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [], count: (data ?? []).length });
}
