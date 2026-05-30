import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/login-requests
 *
 * Returns recent partner login requests.
 * Supports:
 *   ?status=<new|completed|dismissed>  — filter by status
 *   ?limit=<n>                         — max results (default 50, max 200)
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);

  let query = supabaseAdmin
    .from("partner_login_requests")
    .select("id, created_at, email, partner_account_id, status")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/admin/login-requests] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch login requests." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
