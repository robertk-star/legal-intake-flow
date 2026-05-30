import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/partner/request-login
 *
 * Accepts a partner email, records a login request in partner_login_requests,
 * and always returns the same confirmation message regardless of whether the
 * email matches an existing account — to avoid account enumeration.
 *
 * No email is sent. The admin reviews login requests in /admin/partners
 * and generates a new login link manually.
 */
export async function POST(request: Request) {
  let email: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Basic email format validation
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
  }

  // Look up whether a partner account exists for this email (silent — not exposed to client)
  const { data: account } = await supabaseAdmin
    .from("partner_accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  // Collect request metadata
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Insert login request — always, regardless of whether account exists
  const { error: insertError } = await supabaseAdmin
    .from("partner_login_requests")
    .insert({
      email,
      partner_account_id: account?.id ?? null,
      status: "new",
      ip_address: ip,
      user_agent: userAgent,
    });

  if (insertError) {
    console.error("[request-login] Insert error:", insertError);
    // Still return success to avoid leaking information
  }

  // Always return the same response — do not reveal account existence
  return NextResponse.json({ success: true });
}
