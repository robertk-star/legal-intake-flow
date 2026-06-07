import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import {
  createPartnerLoginCode,
  sendPartnerLoginCodeEmail,
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
 * Accepts a partner email, records a login request, and returns a neutral
 * confirmation. If the email matches an active/pending partner user, LIF emails
 * a short numeric login code instead of a magic login link.
 */
export async function POST(request: Request) {
  const limited = rateLimitResponse(request, { keyPrefix: "partner-request-login", limit: 5, windowMs: 15 * 60 * 1000 });
  if (limited) return limited;

  let email: string;

  try {
    const body = await request.json();
    email = (body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 422 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

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

    if (account) resolvedAccount = account as PartnerAccountLookup;
  } else {
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

  const { data: loginRequest, error: insertError } = await supabaseAdmin
    .from("partner_login_requests")
    .insert({
      email,
      partner_account_id: resolvedAccountId,
      partner_user_id: resolvedUserId,
      status: "new",
      ip_address: ip,
      user_agent: userAgent,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error("[request-login] Insert error:", insertError);
  }

  const loginRequestId = (loginRequest?.id as string | undefined) ?? null;

  const accountIsAllowed = resolvedAccount?.status === "active" || resolvedAccount?.status === "pending";
  if (resolvedUser && resolvedAccount && accountIsAllowed) {
    const codeResult = await createPartnerLoginCode({
      partnerAccountId: resolvedAccount.id,
      partnerUserId: resolvedUser.id,
      email: resolvedUser.email,
      loginRequestId,
      ipAddress: ip,
      userAgent,
    });

    if (codeResult.code && codeResult.expiresAt) {
      const recipientName = `${resolvedUser.first_name} ${resolvedUser.last_name}`.trim() || null;
      const emailResult = await sendPartnerLoginCodeEmail({
        partnerAccountId: resolvedAccount.id,
        partnerUserId: resolvedUser.id,
        loginRequestId,
        recipientEmail: resolvedUser.email,
        recipientName,
        firmName: resolvedAccount.firm_name,
        code: codeResult.code,
        expiresAt: codeResult.expiresAt,
      });

      if (emailResult.sent && loginRequestId) {
        const { error: updateError } = await supabaseAdmin
          .from("partner_login_requests")
          .update({ status: "completed" })
          .eq("id", loginRequestId);

        if (updateError) console.error("[request-login] Failed to mark login request completed:", updateError);
      }
    }
  }

  return NextResponse.json({ success: true });
}
