import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashLoginToken } from "@/lib/partnerAuth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * POST /api/admin/partners/[id]/generate-login-link
 *
 * Generates a one-time login link scoped to the partner account's owner user.
 *
 * Resolution order for the partner user:
 *   1. First active/pending user with role = "owner" on the account.
 *   2. First active/pending user on the account (any role) — fallback if no
 *      owner row exists yet (e.g. legacy data before Phase 8 migration).
 *
 * The token row stores both partner_account_id and partner_user_id so the
 * /api/partner/login handler can build a full session (accountId + userId + role).
 *
 * Security:
 *   - Only the SHA-256 hash of the raw token is stored.
 *   - The raw token is returned once and never persisted.
 *   - Token expires in 7 days.
 *   - Token is single-use (marked used_at on login).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: partnerAccountId } = await params;

  // ── Confirm partner account exists ───────────────────────────────────────────
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, email, status")
    .eq("id", partnerAccountId)
    .single();

  if (accountError || !account) {
    return NextResponse.json(
      { success: false, error: "Partner account not found." },
      { status: 404 }
    );
  }

  if ((account.status as string) === "suspended") {
    return NextResponse.json(
      { success: false, error: "Cannot generate a login link for a suspended account." },
      { status: 403 }
    );
  }

  // ── Resolve the owner partner user ───────────────────────────────────────────
  // Prefer owner role; fall back to any active/pending user on the account.
  const { data: users } = await supabaseAdmin
    .from("partner_users")
    .select("id, role, status")
    .eq("partner_account_id", partnerAccountId)
    .in("status", ["active", "pending"])
    .order("role", { ascending: true }); // owner sorts before staff/viewer alphabetically

  // Find owner first, then any user
  const ownerUser = (users ?? []).find((u) => u.role === "owner");
  const fallbackUser = (users ?? [])[0] ?? null;
  const resolvedUser = ownerUser ?? fallbackUser;

  if (!resolvedUser) {
    return NextResponse.json(
      {
        success: false,
        error:
          "No active partner user found for this account. " +
          "Please add an owner user from the Partner Accounts dashboard before generating a login link.",
      },
      { status: 422 }
    );
  }

  // ── Generate token ────────────────────────────────────────────────────────────
  const rawTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(rawTokenBytes);
  const rawToken = Buffer.from(rawTokenBytes).toString("base64url");

  const tokenHash = await hashLoginToken(rawToken);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

  // Store hash with both account and user IDs
  const { error: insertError } = await supabaseAdmin
    .from("partner_login_tokens")
    .insert({
      partner_account_id: partnerAccountId,
      partner_user_id:    resolvedUser.id,
      token_hash:         tokenHash,
      expires_at:         expiresAt,
    });

  if (insertError) {
    console.error("[generate-login-link/account] Insert error:", insertError);
    return NextResponse.json(
      { success: false, error: "Failed to generate login link." },
      { status: 500 }
    );
  }

  const origin = new URL(request.url).origin;
  const loginUrl = `${origin}/partner/login?token=${rawToken}`;

  return NextResponse.json({
    success: true,
    loginUrl,
    expiresAt,
    resolvedUserId: resolvedUser.id,
    resolvedUserRole: resolvedUser.role,
  });
}
