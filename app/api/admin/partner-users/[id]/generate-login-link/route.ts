import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashLoginToken } from "@/lib/partnerAuth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/admin/partner-users/[id]/generate-login-link
 *
 * Generates a one-time login link for a specific partner user.
 *
 * Security:
 *   - Only the SHA-256 hash of the raw token is stored.
 *   - The raw token is returned once and never persisted.
 *   - Token expires in 7 days.
 *   - Token is single-use (marked used_at on login).
 *
 * The login URL uses the existing /partner/login?token= flow.
 * The token row includes partner_user_id so the login handler can
 * resolve the correct user without guessing.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: partnerUserId } = await params;

  // Load the partner user (and their account)
  const { data: user, error: userError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, status")
    .eq("id", partnerUserId)
    .single();

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: "Partner user not found." },
      { status: 404 }
    );
  }

  // Confirm the partner account is in a valid state
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, status")
    .eq("id", user.partner_account_id)
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { success: false, error: "Partner account not found." },
      { status: 404 }
    );
  }

  if (account.status === "suspended") {
    return NextResponse.json(
      { success: false, error: "Cannot generate a login link for a suspended account." },
      { status: 403 }
    );
  }

  // Generate a cryptographically secure random token (32 bytes = 256 bits, base64url)
  const rawTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(rawTokenBytes);
  const rawToken = Buffer.from(rawTokenBytes).toString("base64url");

  // Hash the raw token — only the hash is stored
  const tokenHash = await hashLoginToken(rawToken);

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

  // Store the hash with both account and user IDs
  const { error: insertError } = await supabaseAdmin
    .from("partner_login_tokens")
    .insert({
      partner_account_id: user.partner_account_id,
      partner_user_id:    partnerUserId,
      token_hash:         tokenHash,
      expires_at:         expiresAt,
    });

  if (insertError) {
    console.error("[generate-login-link/user] Insert error:", insertError);
    return NextResponse.json(
      { success: false, error: "Failed to generate login link." },
      { status: 500 }
    );
  }

  // Build the login URL using the request origin
  const origin = new URL(request.url).origin;
  const loginUrl = `${origin}/partner/login?token=${rawToken}`;

  return NextResponse.json({
    success: true,
    loginUrl,
    expiresAt,
    user: {
      id:         user.id,
      email:      user.email,
      first_name: user.first_name,
      last_name:  user.last_name,
    },
  });
}
