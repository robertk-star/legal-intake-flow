import { NextResponse } from "next/server";
import { getAuthenticatedPartnerSession } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createPartnerApiKey, hashPartnerApiKey } from "@/lib/partnerIntegrations";

const EDIT_ROLES = ["owner", "admin"];

export async function POST() {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!EDIT_ROLES.includes(session.role)) {
    return NextResponse.json(
      { error: "Only owner and admin users can generate API keys." },
      { status: 403 }
    );
  }

  const rawKey = createPartnerApiKey();
  const keyHash = await hashPartnerApiKey(rawKey);
  const now = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("partner_accounts")
    .update({
      api_access_enabled: true,
      api_key_hash: keyHash,
      api_key_last_four: rawKey.slice(-4),
      api_key_created_at: now,
      api_key_revoked_at: null,
    })
    .eq("id", session.partnerAccountId);

  if (error) {
    console.error("[POST /api/partner/integrations/api-key] Supabase error:", error);
    return NextResponse.json({ error: "Failed to generate API key." }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    api_key: rawKey,
    api_key_last_four: rawKey.slice(-4),
    api_key_created_at: now,
    message: "Copy this key now. LIF will not show the full key again.",
  });
}

export async function DELETE() {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!EDIT_ROLES.includes(session.role)) {
    return NextResponse.json(
      { error: "Only owner and admin users can revoke API keys." },
      { status: 403 }
    );
  }

  const { error } = await supabaseAdmin
    .from("partner_accounts")
    .update({
      api_access_enabled: false,
      api_key_hash: null,
      api_key_last_four: null,
      api_key_created_at: null,
      api_key_revoked_at: new Date().toISOString(),
    })
    .eq("id", session.partnerAccountId);

  if (error) {
    console.error("[DELETE /api/partner/integrations/api-key] Supabase error:", error);
    return NextResponse.json({ error: "Failed to revoke API key." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
