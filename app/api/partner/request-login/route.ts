import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createPartnerLoginToken,
  sendPartnerLoginLinkEmail,
} from "@/lib/emailNotifications";

type PartnerUserLookup = {
  id: string;
  partner_account_id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: string;
};

type PartnerAccountLookup = {
  id: string;
  firm_name: string;
  email: string;
  status: string;
};

/**
 * POST /api/partner/request-login
 *
 * Accepts a partner email, records a login request in partner_login_requests,
 * and always returns the same confirmation message regardless of whether the
 * email matches an existing user — to avoid account enumeration.
 *
 * Phase 14 behavior:
 *   - If the email matches an active/pending partner user and email is configured,
 *     generate a one-time login token and email it automatically.
 *   - If no match or email is not configured, the request remains visible to admin
 *     for manual handling.
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

  // ── Look up partner user by email (Phase 8+ path) ─────────────────────────
  const { data: partnerUser } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, status")
    .eq("email", email)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let resolvedAccountId: string | null = null;
  let resolvedUserId: string | null = null;
  let resolvedUser: PartnerUserLookup | null = null;
  let resolvedAccount: PartnerAccountLookup | null = null;

  if (partnerUser) {
    resolvedUser = partnerUser as PartnerUserLookup;
    resolvedAccountId = resolvedUser.partner_account_id;
    resolvedUserId = resolvedUser.id;

    const { data: account } = await supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, email, status")
      .eq("id", resolvedUser.partner_account_id)
      .maybeSingle();

    if (account) {
      resolvedAccount = account as PartnerAccountLookup;
    }
  } else {
    // ── Fallback: look up partner_accounts by email (legacy) ─────────────────
    const { data: account } = await supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, email, status")
      .eq("email", email)
      .maybeSingle();

    if (account) {
      resolvedAccount = account as PartnerAccountLookup;
      resolvedAccountId = resolvedAccount.id;
    }
  }

  // Collect request metadata
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Insert login request — always, regardless of whether account/user exists.
  const { data: loginRequest, error: insertError } = await supabaseAdmin
    .from("partner_login_requests")
    .insert({
      email,
      partner_account_id: resolvedAccountId,
      partner_user_id:    resolvedUserId,
      status:             "new",
      ip_address:         ip,
      user_agent:         userAgent,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[request-login] Insert error:", insertError);
    // Continue to neutral success below to avoid leaking information.
  }

  const loginRequestId = (loginRequest?.id as string | undefined) ?? null;

  // Phase 14 automatic email path. Only run if we have a real partner user and
  // the account is allowed to authenticate. Failures do not alter the public response.
  const accountIsAllowed = resolvedAccount?.status === "active" || resolvedAccount?.status === "pending";
  if (resolvedUser && resolvedAccount && accountIsAllowed) {
    const token = await createPartnerLoginToken(resolvedAccount.id, resolvedUser.id);

    if (token.rawToken && token.expiresAt) {
      const origin = (process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin);
      const loginUrl = `${origin}/partner/login?token=${token.rawToken}`;
      const recipientName = `${resolvedUser.first_name} ${resolvedUser.last_name}`.trim() || null;

      const emailResult = await sendPartnerLoginLinkEmail({
        origin,
        partnerAccountId: resolvedAccount.id,
        partnerUserId: resolvedUser.id,
        loginRequestId,
        loginUrl,
        expiresAt: token.expiresAt,
        recipientEmail: resolvedUser.email,
        recipientName,
        firmName: resolvedAccount.firm_name,
      });

      if (emailResult.sent && loginRequestId) {
        const { error: updateError } = await supabaseAdmin
          .from("partner_login_requests")
          .update({ status: "completed" })
          .eq("id", loginRequestId);

        if (updateError) {
          console.error("[request-login] Failed to mark login request completed:", updateError);
        }
      }
    }
  }

  // Always return the same response — do not reveal account/user existence or email status.
  return NextResponse.json({ success: true });
}
