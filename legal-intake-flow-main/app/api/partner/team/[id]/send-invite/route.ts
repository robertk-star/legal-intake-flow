import { NextResponse } from "next/server";
import { getAuthenticatedPartnerSession, type PartnerRole } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { createPartnerUserLoginLink } from "@/lib/partnerLoginLinks";
import { sendPartnerLoginLinkEmail } from "@/lib/emailNotifications";

function canManageTeam(role: PartnerRole) {
  return role === "owner" || role === "admin";
}

function originFromRequest(request: Request) {
  const url = new URL(request.url);
  return process.env.LIF_APP_URL || `${url.protocol}//${url.host}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getAuthenticatedPartnerSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!canManageTeam(session.role)) {
    return NextResponse.json(
      { error: "Only owner or admin users can send team invitations." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const origin = originFromRequest(request);

  const { data: user, error: userError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, role, status, invite_email_count")
    .eq("id", id)
    .eq("partner_account_id", session.partnerAccountId)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  if (user.status !== "active" && user.status !== "pending") {
    return NextResponse.json(
      { error: "Invitations can only be sent to active or pending team members." },
      { status: 422 }
    );
  }

  const { data: account } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name")
    .eq("id", session.partnerAccountId)
    .single();

  const linkResult = await createPartnerUserLoginLink(id, origin);
  if (!linkResult.success || !linkResult.loginUrl || !linkResult.expiresAt) {
    return NextResponse.json(
      { error: linkResult.error ?? "Failed to create login link." },
      { status: linkResult.status || 500 }
    );
  }

  const emailResult = await sendPartnerLoginLinkEmail({
    origin,
    partnerAccountId: session.partnerAccountId,
    partnerUserId: id,
    loginUrl: linkResult.loginUrl,
    expiresAt: linkResult.expiresAt,
    recipientEmail: user.email as string,
    recipientName: `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || null,
    firmName: typeof account?.firm_name === "string" ? account.firm_name : null,
  });

  let updatedUser: unknown = null;
  if (emailResult.sent) {
    const now = new Date().toISOString();
    const currentCount = Number((user as Record<string, unknown>).invite_email_count ?? 0);
    const { data } = await supabaseAdmin
      .from("partner_users")
      .update({
        invite_email_sent_at: now,
        invite_email_count: currentCount + 1,
      })
      .eq("id", id)
      .eq("partner_account_id", session.partnerAccountId)
      .select("id, invite_email_sent_at, invite_email_count")
      .single();
    updatedUser = data ?? null;
  }

  return NextResponse.json({
    success: true,
    sent: emailResult.sent,
    skipped: emailResult.skipped,
    failed: !emailResult.sent && !emailResult.skipped,
    error: emailResult.error ?? null,
    expiresAt: linkResult.expiresAt,
    // Returned once so the partner owner/admin can manually copy it if email is not configured.
    loginUrl: linkResult.loginUrl,
    user: updatedUser ?? null,
  });
}
