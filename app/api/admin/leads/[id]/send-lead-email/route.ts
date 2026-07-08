import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { leadEmailSender, sendLeadOutreachEmail, textToHtml } from "@/lib/leadEmailOutreach";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function displayName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || null;
}

/**
 * POST /api/admin/leads/[id]/send-lead-email
 *
 * Sends an admin-triggered email directly to a lead/claimant and stores a full
 * outreach record for audit/history. Uses Gmail SMTP via support@disabilitybenefitsscreening.com.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!isPlainObject(body)) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const subject = str(body.subject);
  const message = str(body.message ?? body.body ?? body.body_text);

  if (!subject || subject.length < 3) {
    return NextResponse.json({ error: "Subject is required." }, { status: 422 });
  }

  if (!message || message.length < 10) {
    return NextResponse.json({ error: "Message body is required." }, { status: 422 });
  }

  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, first_name, last_name, email, lead_outreach_email_count")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  }

  const leadRow = lead as {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    lead_outreach_email_count?: number | null;
  };
  const recipientEmail = str(leadRow.email)?.toLowerCase();
  const recipientName = displayName(leadRow.first_name, leadRow.last_name);

  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    return NextResponse.json({ error: "This lead does not have a valid email address." }, { status: 422 });
  }

  const sender = leadEmailSender();
  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
      ${textToHtml(message)}
    </div>
  `;

  const { data: outreach, error: insertError } = await supabaseAdmin
    .from("lead_outreach_emails")
    .insert({
      lead_id: id,
      recipient_email: recipientEmail,
      recipient_name: recipientName,
      sender_email: sender.email,
      sender_name: sender.name,
      subject,
      body_text: message,
      body_html: bodyHtml,
      status: "queued",
      provider: "gmail_smtp",
      sent_by: "admin",
      metadata: {
        source: "admin_lead_outreach",
      },
    })
    .select("id")
    .single();

  if (insertError || !outreach) {
    console.error("[POST /api/admin/leads/[id]/send-lead-email] Insert error:", insertError);
    return NextResponse.json({ error: "Failed to create lead email record." }, { status: 500 });
  }

  const outreachId = (outreach as { id: string }).id;
  const result = await sendLeadOutreachEmail({
    to: recipientEmail,
    recipientName,
    subject,
    text: message,
  });

  const now = new Date().toISOString();
  const nextStatus = result.sent ? "sent" : result.skipped ? "skipped" : "failed";

  const { data: updated, error: updateError } = await supabaseAdmin
    .from("lead_outreach_emails")
    .update({
      status: nextStatus,
      provider_message_id: result.providerMessageId ?? null,
      sent_at: result.sent ? now : null,
      error_message: result.error ?? null,
      sender_email: result.senderEmail ?? sender.email,
      sender_name: result.senderName ?? sender.name,
    })
    .eq("id", outreachId)
    .select(
      "id, created_at, updated_at, recipient_email, recipient_name, sender_email, sender_name, " +
      "subject, body_text, status, provider, provider_message_id, sent_at, error_message, sent_by"
    )
    .single();

  if (updateError) {
    console.error("[POST /api/admin/leads/[id]/send-lead-email] Outreach update error:", updateError);
  }

  if (result.sent) {
    const currentCount = Number(leadRow.lead_outreach_email_count ?? 0);
    const { error: leadUpdateError } = await supabaseAdmin
      .from("leads")
      .update({
        lead_outreach_email_sent_at: now,
        lead_outreach_email_count: currentCount + 1,
      })
      .eq("id", id);

    if (leadUpdateError) {
      console.warn("[POST /api/admin/leads/[id]/send-lead-email] Lead outreach summary update failed:", leadUpdateError.message);
    }
  }

  if (!result.sent) {
    return NextResponse.json(
      {
        success: false,
        error: result.error ?? "Lead email was not sent.",
        skipped: result.skipped,
        data: updated ?? null,
      },
      { status: result.skipped ? 503 : 500 }
    );
  }

  return NextResponse.json({ success: true, data: updated ?? null });
}
