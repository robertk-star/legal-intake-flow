import { hashLoginToken, type PartnerRole } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface PartnerLoginLinkResult {
  success: boolean;
  status: number;
  error?: string;
  loginUrl?: string;
  expiresAt?: string;
  user?: {
    id: string;
    partner_account_id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: PartnerRole;
  };
}

export async function createPartnerUserLoginLink(
  partnerUserId: string,
  origin: string
): Promise<PartnerLoginLinkResult> {
  const { data: user, error: userError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, role, status")
    .eq("id", partnerUserId)
    .single();

  if (userError || !user) {
    return { success: false, status: 404, error: "Partner user not found." };
  }

  if (user.status !== "active" && user.status !== "pending") {
    return { success: false, status: 403, error: "Cannot generate a login link for an inactive or suspended user." };
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, status")
    .eq("id", user.partner_account_id)
    .single();

  if (accountError || !account) {
    return { success: false, status: 404, error: "Partner account not found." };
  }

  if (account.status !== "active" && account.status !== "pending") {
    return { success: false, status: 403, error: "Cannot generate a login link for an inactive or suspended account." };
  }

  const rawTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(rawTokenBytes);
  const rawToken = Buffer.from(rawTokenBytes).toString("base64url");
  const tokenHash = await hashLoginToken(rawToken);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

  const { error: insertError } = await supabaseAdmin
    .from("partner_login_tokens")
    .insert({
      partner_account_id: user.partner_account_id,
      partner_user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("[createPartnerUserLoginLink] Insert error:", insertError);
    return { success: false, status: 500, error: "Failed to generate login link." };
  }

  return {
    success: true,
    status: 200,
    loginUrl: `${origin}/partner/login?token=${rawToken}`,
    expiresAt,
    user: {
      id: user.id as string,
      partner_account_id: user.partner_account_id as string,
      email: user.email as string,
      first_name: user.first_name as string,
      last_name: user.last_name as string,
      role: user.role as PartnerRole,
    },
  };
}
