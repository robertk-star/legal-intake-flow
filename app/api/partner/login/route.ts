import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  hashLoginToken,
  createPartnerSessionToken,
  PARTNER_COOKIE_NAME,
  THIRTY_DAYS_SECONDS,
  type PartnerRole,
} from "@/lib/partnerAuth";

/**
 * GET /api/partner/login?token=<raw_token>
 *
 * Validates a one-time partner login token, resolves the partner user,
 * sets a signed HTTP-only lif_partner_session cookie (containing
 * partnerAccountId + partnerUserId + role), and redirects to /partner/account.
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

  const { data: loginToken, error: tokenError } = await supabaseAdmin
    .from("partner_login_tokens")
    .select("id, partner_account_id, partner_user_id, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  // Token not found
  if (tokenError || !loginToken) {
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

  // ── Fetch partner account ─────────────────────────────────────────────────
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

  // ── Resolve partner user ──────────────────────────────────────────────────
  //
  // Preferred: token has an explicit partner_user_id (Phase 8+ tokens).
  // Fallback:  find the owner user for this account (legacy tokens from Phase 5–7).

  let partnerUserId: string;
  let partnerRole: PartnerRole;

  if (loginToken.partner_user_id) {
    // Token is user-scoped — load that specific user
    const { data: user, error: userError } = await supabaseAdmin
      .from("partner_users")
      .select("id, partner_account_id, role, status")
      .eq("id", loginToken.partner_user_id)
      .single();

    if (userError || !user) {
      return NextResponse.redirect(new URL("/partner/login?error=invalid", request.url));
    }

    // Ensure user belongs to this account
    if (user.partner_account_id !== account.id) {
      return NextResponse.redirect(new URL("/partner/login?error=invalid", request.url));
    }

    if (user.status !== "active" && user.status !== "pending") {
      return NextResponse.redirect(new URL("/partner/login?error=inactive", request.url));
    }

    partnerUserId = user.id as string;
    partnerRole   = user.role as PartnerRole;
  } else {
    // Legacy token (account-scoped) — find the owner user for this account
    const { data: ownerUser, error: ownerError } = await supabaseAdmin
      .from("partner_users")
      .select("id, role, status")
      .eq("partner_account_id", account.id)
      .eq("role", "owner")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownerError || !ownerUser) {
      // No owner user found — fall back to any active user for this account
      const { data: anyUser, error: anyError } = await supabaseAdmin
        .from("partner_users")
        .select("id, role, status")
        .eq("partner_account_id", account.id)
        .in("status", ["active", "pending"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (anyError || !anyUser) {
        return NextResponse.redirect(new URL("/partner/login?error=invalid", request.url));
      }

      partnerUserId = anyUser.id as string;
      partnerRole   = anyUser.role as PartnerRole;
    } else {
      partnerUserId = ownerUser.id as string;
      partnerRole   = ownerUser.role as PartnerRole;
    }
  }

  // ── Mark token used ───────────────────────────────────────────────────────
  await supabaseAdmin
    .from("partner_login_tokens")
    .update({ used_at: new Date().toISOString() })
    .eq("id", loginToken.id);

  // ── Update last_login_at on both account and user ─────────────────────────
  const now = new Date().toISOString();

  await supabaseAdmin
    .from("partner_accounts")
    .update({ last_login_at: now })
    .eq("id", account.id);

  await supabaseAdmin
    .from("partner_users")
    .update({ last_login_at: now })
    .eq("id", partnerUserId);

  // ── Create signed partner session token ──────────────────────────────────
  const sessionToken = await createPartnerSessionToken(
    account.id as string,
    partnerUserId,
    partnerRole
  );

  // ── Set the HTTP-only cookie ──────────────────────────────────────────────
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
