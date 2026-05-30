import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/partner/request-login
 *
 * Accepts a partner email, records a login request in partner_login_requests,
 * and always returns the same confirmation message regardless of whether the
 * email matches an existing user — to avoid account enumeration.
 *
 * Lookup order:
 *   1. Search partner_users by email (Phase 8+)
 *   2. Fall back to partner_accounts by email (legacy, for accounts without users)
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

  // ── Look up partner user by email (Phase 8+ path) ─────────────────────────
  const { data: partnerUser } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, status")
    .eq("email", email)
    .in("status", ["active", "pending"])
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let resolvedAccountId: string | null = null;
  let resolvedUserId: string | null = null;

  if (partnerUser) {
    resolvedAccountId = partnerUser.partner_account_id as string;
    resolvedUserId    = partnerUser.id as string;
  } else {
    // ── Fallback: look up partner_accounts by email (legacy) ─────────────────
    const { data: account } = await supabaseAdmin
      .from("partner_accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (account) {
      resolvedAccountId = account.id as string;
    }
  }

  // Collect request metadata
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? null;
  const userAgent = request.headers.get("user-agent") ?? null;

  // Insert login request — always, regardless of whether account/user exists
  const { error: insertError } = await supabaseAdmin
    .from("partner_login_requests")
    .insert({
      email,
      partner_account_id: resolvedAccountId,
      partner_user_id:    resolvedUserId,
      status:             "new",
      ip_address:         ip,
      user_agent:         userAgent,
    });

  if (insertError) {
    console.error("[request-login] Insert error:", insertError);
    // Still return success to avoid leaking information
  }

  // Always return the same response — do not reveal account/user existence
  return NextResponse.json({ success: true });
}
