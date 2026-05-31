import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/partners/[id]/profile-events
 *
 * Returns recent partner-maintained firm profile/billing contact change events.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "10", 10) || 10, 50);

  const { data, error } = await supabaseAdmin
    .from("partner_account_profile_events")
    .select(
      "id, created_at, partner_account_id, partner_user_id, event_type, changed_fields, previous_values, new_values, note"
    )
    .eq("partner_account_id", id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[GET /api/admin/partners/[id]/profile-events] Supabase error:", error);
    return NextResponse.json({ success: false, error: "Failed to load profile change history." }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
