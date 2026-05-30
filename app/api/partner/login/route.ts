import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  hashLoginToken,
  createPartnerSessionToken,
  PARTNER_COOKIE_NAME,
  THIRTY_DAYS_SECONDS,
} from "@/lib/partnerAuth";

/**
 * GET /api/partner/login?token=<raw_token>
 *
 * Validates a one-time partner login token, sets the signed HTTP-only
 * lif_partner_session cookie, and redirects to /partner/account.
 *
 * All cookie mutation happens here in a Route Handler (not in a Server
 * Component), which is the correct pattern for Next.js App Router.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  // No token — redirect to the error page
  if (!token) {
    return NextResponse.redirect(new URL("/partner/login?error=missing", request.url));
  }

  // Hash the raw token and look it up
  const tokenHash = await hashLoginToken(token);

  const { data: loginToken, error } = await supabaseAdmin
    .from("partner_login_tokens")
    .select("id, partner_account_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  // Token not found
  if (error || !loginToken) {
    return NextResponse.redirect(new URL("/partner/login?error=invalid", request.url));
  }

  // Token already used
  if (loginToken.used_at) {
    return NextResponse.redirect(new URL("/partner/login?error=used", request.url));
  }

  // Token expired
  if (new Date(loginToken.expires_at as string) < new Date()) {
    return NextResponse.redirect(new URL("/partner/login?error=expired", request.url));
  }

  // Fetch the partner account
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, status")
    .eq("id", loginToken.partner_account_id)
    .single();

  if (accountError || !account) {
    return NextResponse.redirect(new URL("/partner/login?error=invalid", request.url));
  }

  // Account must be active or pending
  if (account.status !== "active" && account.status !== "pending") {
    return NextResponse.redirect(new URL("/partner/login?error=inactive", request.url));
  }

  // Mark token as used
  await supabaseAdmin
    .from("partner_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", loginToken.id);

  // Update last_login_at
  await supabaseAdmin
    .from("partner_accounts")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", account.id);

  // Create signed partner session token
  const sessionToken = await createPartnerSessionToken(account.id as string);

  // Set the HTTP-only cookie — this is valid inside a Route Handler
  const cookieStore = await cookies();
  cookieStore.set(PARTNER_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: THIRTY_DAYS_SECONDS,
  });

  // Redirect to partner account page
  return NextResponse.redirect(new URL("/partner/account", request.url));
}
