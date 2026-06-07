import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/partner-requests/[id]/partner-account
 *
 * Read-only lookup: returns the partner account linked to this access request
 * (matched by partner_request_id, falling back to email match).
 *
 * Returns:
 *   { found: true,  data: PartnerAccount }  — account exists
 *   { found: false }                         — no account yet
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: requestId } = await params;

  // First try: look up by partner_request_id (most precise)
  const { data: byRequestId } = await supabaseAdmin
    .from("partner_accounts")
    .select("*")
    .eq("partner_request_id", requestId)
    .maybeSingle();

  if (byRequestId) {
    return NextResponse.json({ success: true, found: true, data: byRequestId });
  }

  // Fallback: look up by email (handles cases where account was created independently)
  const { data: req } = await supabaseAdmin
    .from("partner_access_requests")
    .select("email")
    .eq("id", requestId)
    .maybeSingle();

  if (req?.email) {
    const { data: byEmail } = await supabaseAdmin
      .from("partner_accounts")
      .select("*")
      .eq("email", (req.email as string).toLowerCase().trim())
      .maybeSingle();

    if (byEmail) {
      return NextResponse.json({ success: true, found: true, data: byEmail });
    }
  }

  return NextResponse.json({ success: true, found: false });
}
