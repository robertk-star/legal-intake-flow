import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashLoginToken } from "@/lib/partnerAuth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ success: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id: partnerAccountId } = await params;

  // Confirm partner account exists
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

  // Generate a cryptographically secure random token (32 bytes = 256 bits, base64url)
  const rawTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(rawTokenBytes);
  const rawToken = Buffer.from(rawTokenBytes).toString("base64url");

  // Hash the raw token — only the hash is stored
  const tokenHash = await hashLoginToken(rawToken);

  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

  // Store the hash
  const { error: insertError } = await supabaseAdmin
    .from("partner_login_tokens")
    .insert({
      partner_account_id: partnerAccountId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (insertError) {
    console.error("[generate-login-link] Insert error:", insertError);
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
  });
}
