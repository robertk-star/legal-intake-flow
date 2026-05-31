import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { hashLoginToken } from "@/lib/partnerAuth";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export type EmailNotificationType =
  | "partner_login_link"
  | "lead_assigned"
  | "invoice_sent"
  | "invoice_reminder";

export type EmailSendResult = {
  sent: boolean;
  skipped: boolean;
  notificationId: string | null;
  providerMessageId?: string | null;
  error?: string | null;
};

type SendTransactionalEmailInput = {
  to: string;
  recipientName?: string | null;
  subject: string;
  text: string;
  html: string;
  notificationType: EmailNotificationType;
  leadId?: string | null;
  partnerAccountId?: string | null;
  partnerUserId?: string | null;
  loginRequestId?: string | null;
  invoiceId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PartnerUserForEmail = {
  id: string;
  partner_account_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
};

type PartnerAccountForEmail = {
  id: string;
  firm_name: string;
  email: string;
  status: string;
};

type LeadForEmail = {
  id: string;
  external_reference_id: string | null;
  first_name: string | null;
  last_name: string | null;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  assigned_at: string | null;
};

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function displayName(firstName?: string | null, lastName?: string | null) {
  const name = `${firstName ?? ""} ${lastName ?? ""}`.trim();
  return name || null;
}

function claimantName(lead: LeadForEmail) {
  return displayName(lead.first_name, lead.last_name) ?? "New Lead";
}

async function insertNotification(input: SendTransactionalEmailInput, status = "queued") {
  const { data, error } = await supabaseAdmin
    .from("email_notifications")
    .insert({
      notification_type: input.notificationType,
      recipient_email: input.to.toLowerCase(),
      recipient_name: input.recipientName ?? null,
      subject: input.subject,
      status,
      provider: "resend",
      lead_id: input.leadId ?? null,
      partner_account_id: input.partnerAccountId ?? null,
      partner_user_id: input.partnerUserId ?? null,
      login_request_id: input.loginRequestId ?? null,
      invoice_id: input.invoiceId ?? null,
      metadata: input.metadata ?? null,
    })
    .select("id")
    .single();

  if (error) {
    // Do not block business workflows if the notification table has not been migrated yet.
    console.error("[emailNotifications] Failed to insert email notification:", error);
    return null;
  }

  return (data?.id as string | undefined) ?? null;
}

async function updateNotification(
  id: string | null,
  updates: Record<string, unknown>
) {
  if (!id) return;

  const { error } = await supabaseAdmin
    .from("email_notifications")
    .update(updates)
    .eq("id", id);

  if (error) {
    console.error("[emailNotifications] Failed to update email notification:", error);
  }
}

export async function sendTransactionalEmail(input: SendTransactionalEmailInput): Promise<EmailSendResult> {
  const notificationId = await insertNotification(input);

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LIF_EMAIL_FROM;
  const replyTo = process.env.LIF_EMAIL_REPLY_TO;

  if (!apiKey || !from) {
    const error = "Email provider is not configured. Set RESEND_API_KEY and LIF_EMAIL_FROM.";
    await updateNotification(notificationId, {
      status: "skipped",
      error_message: error,
    });
    return { sent: false, skipped: true, notificationId, error };
  }

  try {
    const payload: Record<string, unknown> = {
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
    };

    if (replyTo) payload.reply_to = replyTo;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = typeof data?.message === "string"
        ? data.message
        : `Resend returned HTTP ${res.status}.`;
      await updateNotification(notificationId, {
        status: "failed",
        error_message: error,
      });
      return { sent: false, skipped: false, notificationId, error };
    }

    const providerMessageId = typeof data?.id === "string" ? data.id : null;
    await updateNotification(notificationId, {
      status: "sent",
      sent_at: new Date().toISOString(),
      provider_message_id: providerMessageId,
      error_message: null,
    });

    return { sent: true, skipped: false, notificationId, providerMessageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email delivery error.";
    await updateNotification(notificationId, {
      status: "failed",
      error_message: message,
    });
    return { sent: false, skipped: false, notificationId, error: message };
  }
}

export async function createPartnerLoginToken(partnerAccountId: string, partnerUserId: string) {
  const rawTokenBytes = new Uint8Array(32);
  crypto.getRandomValues(rawTokenBytes);
  const rawToken = Buffer.from(rawTokenBytes).toString("base64url");
  const tokenHash = await hashLoginToken(rawToken);
  const expiresAt = new Date(Date.now() + SEVEN_DAYS_MS).toISOString();

  const { error } = await supabaseAdmin
    .from("partner_login_tokens")
    .insert({
      partner_account_id: partnerAccountId,
      partner_user_id: partnerUserId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    });

  if (error) {
    console.error("[emailNotifications] Failed to create partner login token:", error);
    return { rawToken: null, expiresAt: null, error };
  }

  return { rawToken, expiresAt, error: null };
}

export async function sendPartnerLoginLinkEmail(input: {
  origin: string;
  partnerAccountId: string;
  partnerUserId: string;
  loginRequestId?: string | null;
  loginUrl: string;
  expiresAt: string;
  recipientEmail: string;
  recipientName?: string | null;
  firmName?: string | null;
}) {
  const safeName = input.recipientName ?? "Partner";
  const safeFirm = input.firmName ?? "your firm";
  const expires = new Date(input.expiresAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const subject = "Your Legal Intake Flow login link";
  const text = [
    `Hello ${safeName},`,
    "",
    `Here is your secure Legal Intake Flow login link for ${safeFirm}:`,
    input.loginUrl,
    "",
    `This link expires on ${expires} and can only be used once.`,
    "",
    "If you did not request this link, you can ignore this message.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
      <p>Hello ${escapeHtml(safeName)},</p>
      <p>Here is your secure Legal Intake Flow login link for <strong>${escapeHtml(safeFirm)}</strong>.</p>
      <p>
        <a href="${escapeHtml(input.loginUrl)}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
          Log in to Legal Intake Flow
        </a>
      </p>
      <p style="font-size:13px;color:#4b5563;">This link expires on ${escapeHtml(expires)} and can only be used once.</p>
      <p style="font-size:13px;color:#4b5563;">If you did not request this link, you can ignore this message.</p>
    </div>
  `;

  return sendTransactionalEmail({
    to: input.recipientEmail,
    recipientName: input.recipientName,
    subject,
    text,
    html,
    notificationType: "partner_login_link",
    partnerAccountId: input.partnerAccountId,
    partnerUserId: input.partnerUserId,
    loginRequestId: input.loginRequestId ?? null,
    metadata: {
      expires_at: input.expiresAt,
      origin: input.origin,
      purpose: "partner_login_link",
      // Do not store loginUrl here because it contains the raw one-time token.
    },
  });
}

export async function sendLeadAssignedNotifications(input: {
  origin: string;
  leadId: string;
  partnerAccountId: string;
  assignmentType: "manual" | "best_match" | "reassignment";
}) {
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id, external_reference_id, first_name, last_name, state, benefit_type, application_status, assigned_at")
    .eq("id", input.leadId)
    .single();

  if (leadError || !lead) {
    console.error("[sendLeadAssignedNotifications] Lead lookup failed:", leadError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Lead lookup failed."] };
  }

  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, email, status")
    .eq("id", input.partnerAccountId)
    .single();

  if (accountError || !account) {
    console.error("[sendLeadAssignedNotifications] Partner account lookup failed:", accountError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner account lookup failed."] };
  }

  const { data: users, error: usersError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, role, status")
    .eq("partner_account_id", input.partnerAccountId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "staff"]);

  if (usersError) {
    console.error("[sendLeadAssignedNotifications] Partner users lookup failed:", usersError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner user lookup failed."] };
  }

  const partnerUsers = ((users ?? []) as PartnerUserForEmail[])
    .filter((user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email));

  const dedupedUsers = Array.from(
    new Map(partnerUsers.map((user) => [user.email.toLowerCase(), user])).values()
  );

  if (dedupedUsers.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["No active owner/admin/staff partner users found."] };
  }

  const typedLead = lead as LeadForEmail;
  const typedAccount = account as PartnerAccountForEmail;
  const leadTitle = claimantName(typedLead);
  const leadUrl = `${input.origin}/partner/leads`;
  const subject = "New lead assigned in Legal Intake Flow";

  const summaryLines = [
    typedLead.state ? `State: ${typedLead.state}` : null,
    typedLead.benefit_type ? `Benefit Type: ${typedLead.benefit_type}` : null,
    typedLead.application_status ? `Application Status: ${typedLead.application_status}` : null,
    typedLead.external_reference_id ? `Reference: ${typedLead.external_reference_id}` : null,
  ].filter((line): line is string => Boolean(line));

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of dedupedUsers) {
    const name = displayName(user.first_name, user.last_name) ?? "Partner";
    const text = [
      `Hello ${name},`,
      "",
      `A new lead has been assigned to ${typedAccount.firm_name}.`,
      "",
      `Lead: ${leadTitle}`,
      ...summaryLines,
      "",
      `Review the lead here: ${leadUrl}`,
      "",
      "For privacy, medical details are not included in this email. Please log in to Legal Intake Flow to review the full intake packet.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
        <p>Hello ${escapeHtml(name)},</p>
        <p>A new lead has been assigned to <strong>${escapeHtml(typedAccount.firm_name)}</strong>.</p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:16px 0;background:#f9fafb;">
          <p style="margin:0 0 6px 0;"><strong>Lead:</strong> ${escapeHtml(leadTitle)}</p>
          ${summaryLines.map((line) => `<p style="margin:0 0 4px 0;font-size:13px;color:#4b5563;">${escapeHtml(line)}</p>`).join("")}
        </div>
        <p>
          <a href="${escapeHtml(leadUrl)}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
            Review Assigned Lead
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563;">For privacy, medical details are not included in this email. Please log in to Legal Intake Flow to review the full intake packet.</p>
      </div>
    `;

    const result = await sendTransactionalEmail({
      to: user.email,
      recipientName: name,
      subject,
      text,
      html,
      notificationType: "lead_assigned",
      leadId: input.leadId,
      partnerAccountId: input.partnerAccountId,
      partnerUserId: user.id,
      metadata: {
        assignment_type: input.assignmentType,
        lead_state: typedLead.state,
        benefit_type: typedLead.benefit_type,
        application_status: typedLead.application_status,
        external_reference_id: typedLead.external_reference_id,
      },
    });

    if (result.sent) sent += 1;
    else if (result.skipped) skipped += 1;
    else {
      failed += 1;
      if (result.error) errors.push(result.error);
    }
  }

  let leadSummary: { id: string; assignment_notification_sent_at: string | null; assignment_notification_count: number | null } | null = null;

  if (sent > 0) {
    const { data: updatedLead, error: updateError } = await supabaseAdmin
      .from("leads")
      .update({
        assignment_notification_sent_at: new Date().toISOString(),
        assignment_notification_count: sent,
      })
      .eq("id", input.leadId)
      .select("id, assignment_notification_sent_at, assignment_notification_count")
      .single();

    if (updateError) {
      console.error("[sendLeadAssignedNotifications] Failed to update lead notification summary:", updateError);
    } else if (updatedLead) {
      leadSummary = updatedLead as { id: string; assignment_notification_sent_at: string | null; assignment_notification_count: number | null };
    }
  }

  return {
    attempted: dedupedUsers.length,
    sent,
    skipped,
    failed,
    errors,
    lead: leadSummary,
  };
}


type InvoiceForEmail = {
  id: string;
  partner_account_id: string;
  invoice_number: string;
  status: string;
  period_start: string;
  period_end: string;
  subtotal_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  invoice_email_count: number | null;
  due_date: string | null;
  reminder_count: number | null;
  payment_instructions: string | null;
};

type InvoiceItemForEmail = {
  id: string;
  description: string;
  amount_cents: number;
};

function currency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export async function sendInvoiceEmailNotifications(input: {
  origin: string;
  invoiceId: string;
}) {
  const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .select(
      "id, partner_account_id, invoice_number, status, period_start, period_end, " +
      "subtotal_cents, total_cents, amount_paid_cents, balance_due_cents, invoice_email_count, due_date, payment_instructions"
    )
    .eq("id", input.invoiceId)
    .single();

  if (invoiceError || !invoiceRow) {
    console.error("[sendInvoiceEmailNotifications] Invoice lookup failed:", invoiceError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Invoice lookup failed."] };
  }

  const invoice = invoiceRow as unknown as InvoiceForEmail;

  const { data: accountRow, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, email, status")
    .eq("id", invoice.partner_account_id)
    .single();

  if (accountError || !accountRow) {
    console.error("[sendInvoiceEmailNotifications] Partner account lookup failed:", accountError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner account lookup failed."] };
  }

  const { data: itemRows, error: itemError } = await supabaseAdmin
    .from("partner_billing_invoice_items")
    .select("id, description, amount_cents")
    .eq("invoice_id", input.invoiceId)
    .order("created_at", { ascending: true });

  if (itemError) {
    console.error("[sendInvoiceEmailNotifications] Invoice item lookup failed:", itemError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Invoice item lookup failed."] };
  }

  const { data: userRows, error: usersError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, role, status")
    .eq("partner_account_id", invoice.partner_account_id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  if (usersError) {
    console.error("[sendInvoiceEmailNotifications] Partner users lookup failed:", usersError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner user lookup failed."] };
  }

  const partnerUsers = ((userRows ?? []) as unknown as PartnerUserForEmail[])
    .filter((user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email));

  const dedupedUsers = Array.from(
    new Map(partnerUsers.map((user) => [user.email.toLowerCase(), user])).values()
  );

  if (dedupedUsers.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["No active owner/admin partner users found."] };
  }

  const account = accountRow as unknown as PartnerAccountForEmail;
  const items = (itemRows ?? []) as unknown as InvoiceItemForEmail[];
  const invoiceUrl = `${input.origin}/partner/invoices`;
  const subject = `Legal Intake Flow invoice ${invoice.invoice_number}`;
  const period = `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`;
  const itemPreview = items.slice(0, 5);
  const extraCount = Math.max(items.length - itemPreview.length, 0);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of dedupedUsers) {
    const name = displayName(user.first_name, user.last_name) ?? "Partner";
    const text = [
      `Hello ${name},`,
      "",
      `A Legal Intake Flow invoice is available for ${account.firm_name}.`,
      "",
      `Invoice: ${invoice.invoice_number}`,
      `Billing Period: ${period}`,
      `Total: ${currency(invoice.total_cents)}`,
      `Amount Paid: ${currency(invoice.amount_paid_cents)}`,
      `Balance Due: ${currency(invoice.balance_due_cents)}`,
      `Due Date: ${formatDate(invoice.due_date)}`,
      invoice.payment_instructions ? `Payment Instructions: ${invoice.payment_instructions}` : null,
      "",
      `View invoice details here: ${invoiceUrl}`,
      "",
      "This email is a billing notice only. It does not process payment or create an automatic charge.",
    ].filter((line): line is string => line !== null).join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
        <p>Hello ${escapeHtml(name)},</p>
        <p>A Legal Intake Flow invoice is available for <strong>${escapeHtml(account.firm_name)}</strong>.</p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:16px 0;background:#f9fafb;">
          <p style="margin:0 0 6px 0;"><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_number)}</p>
          <p style="margin:0 0 6px 0;"><strong>Billing Period:</strong> ${escapeHtml(period)}</p>
          <p style="margin:0 0 6px 0;"><strong>Total:</strong> ${escapeHtml(currency(invoice.total_cents))}</p>
          <p style="margin:0 0 6px 0;"><strong>Amount Paid:</strong> ${escapeHtml(currency(invoice.amount_paid_cents))}</p>
          <p style="margin:0 0 6px 0;"><strong>Balance Due:</strong> ${escapeHtml(currency(invoice.balance_due_cents))}</p>
          <p style="margin:0;"><strong>Due Date:</strong> ${escapeHtml(formatDate(invoice.due_date))}</p>
        </div>
        ${invoice.payment_instructions ? `
          <div style="border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;background:#f0fdf4;">
            <p style="font-weight:600;margin:0 0 6px 0;">Payment instructions</p>
            <p style="margin:0;white-space:pre-wrap;">${escapeHtml(invoice.payment_instructions)}</p>
          </div>
        ` : ""}
        ${itemPreview.length > 0 ? `
          <p style="font-weight:600;margin:16px 0 8px 0;">Included lead items</p>
          <ul style="padding-left:18px;margin-top:0;">
            ${itemPreview.map((item) => `<li>${escapeHtml(item.description)} — ${escapeHtml(currency(item.amount_cents))}</li>`).join("")}
            ${extraCount > 0 ? `<li>${extraCount} more item${extraCount === 1 ? "" : "s"} listed in the portal.</li>` : ""}
          </ul>
        ` : ""}
        <p>
          <a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
            View Invoice
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563;">This email is a billing notice only. It does not process payment or create an automatic charge.</p>
      </div>
    `;

    const result = await sendTransactionalEmail({
      to: user.email,
      recipientName: name,
      subject,
      text,
      html,
      notificationType: "invoice_sent",
      partnerAccountId: invoice.partner_account_id,
      partnerUserId: user.id,
      invoiceId: invoice.id,
      metadata: {
        invoice_number: invoice.invoice_number,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        total_cents: invoice.total_cents,
        balance_due_cents: invoice.balance_due_cents,
        item_count: items.length,
      },
    });

    if (result.sent) sent += 1;
    else if (result.skipped) skipped += 1;
    else {
      failed += 1;
      if (result.error) errors.push(result.error);
    }
  }

  let invoiceSummary: {
    id: string;
    invoice_email_sent_at: string | null;
    invoice_email_count: number | null;
    status: string;
    sent_at: string | null;
  } | null = null;

  if (sent > 0) {
    const now = new Date().toISOString();
    const nextCount = Number(invoice.invoice_email_count ?? 0) + sent;
    const invoiceUpdates: Record<string, unknown> = {
      invoice_email_sent_at: now,
      invoice_email_count: nextCount,
    };

    if (invoice.status === "draft") {
      invoiceUpdates.status = "sent";
      invoiceUpdates.sent_at = now;
    }

    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("partner_billing_invoices")
      .update(invoiceUpdates)
      .eq("id", input.invoiceId)
      .select("id, invoice_email_sent_at, invoice_email_count, status, sent_at")
      .single();

    if (updateError) {
      console.error("[sendInvoiceEmailNotifications] Failed to update invoice email summary:", updateError);
    } else if (updatedInvoice) {
      invoiceSummary = updatedInvoice as unknown as {
        id: string;
        invoice_email_sent_at: string | null;
        invoice_email_count: number | null;
        status: string;
        sent_at: string | null;
      };
    }

    if (invoice.status === "draft" && items.length > 0) {
      const { data: invoiceItemsForLeads } = await supabaseAdmin
        .from("partner_billing_invoice_items")
        .select("lead_id")
        .eq("invoice_id", input.invoiceId);
      const relatedLeadIds = ((invoiceItemsForLeads ?? []) as unknown as Array<{ lead_id: string }>)
        .map((item) => item.lead_id)
        .filter(Boolean);
      if (relatedLeadIds.length > 0) {
        await supabaseAdmin
          .from("leads")
          .update({ billable_status: "invoiced" })
          .in("id", relatedLeadIds);
      }
    }

    await supabaseAdmin.from("partner_billing_invoice_events").insert({
      invoice_id: input.invoiceId,
      event_type: "email_sent",
      previous_status: invoice.status,
      next_status: invoiceSummary?.status ?? invoice.status,
      amount_cents: invoice.total_cents,
      notes: `Invoice email sent to ${sent} recipient${sent === 1 ? "" : "s"}.`,
      created_by: "admin",
    });
  }

  return {
    attempted: dedupedUsers.length,
    sent,
    skipped,
    failed,
    errors,
    invoice: invoiceSummary,
  };
}


export async function sendInvoiceReminderNotifications(input: {
  origin: string;
  invoiceId: string;
}) {
  const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
    .from("partner_billing_invoices")
    .select(
      "id, partner_account_id, invoice_number, status, period_start, period_end, " +
      "subtotal_cents, total_cents, amount_paid_cents, balance_due_cents, invoice_email_count, " +
      "due_date, reminder_count"
    )
    .eq("id", input.invoiceId)
    .single();

  if (invoiceError || !invoiceRow) {
    console.error("[sendInvoiceReminderNotifications] Invoice lookup failed:", invoiceError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Invoice lookup failed."] };
  }

  const invoice = invoiceRow as unknown as InvoiceForEmail;

  if (!["sent", "partially_paid"].includes(invoice.status)) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Invoice must be sent or partially paid before reminders can be sent."] };
  }

  if ((invoice.balance_due_cents ?? 0) <= 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Invoice has no balance due."] };
  }

  const { data: accountRow, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, email, status")
    .eq("id", invoice.partner_account_id)
    .single();

  if (accountError || !accountRow) {
    console.error("[sendInvoiceReminderNotifications] Partner account lookup failed:", accountError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner account lookup failed."] };
  }

  const { data: userRows, error: usersError } = await supabaseAdmin
    .from("partner_users")
    .select("id, partner_account_id, email, first_name, last_name, role, status")
    .eq("partner_account_id", invoice.partner_account_id)
    .eq("status", "active")
    .in("role", ["owner", "admin"]);

  if (usersError) {
    console.error("[sendInvoiceReminderNotifications] Partner users lookup failed:", usersError);
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["Partner user lookup failed."] };
  }

  const partnerUsers = ((userRows ?? []) as unknown as PartnerUserForEmail[])
    .filter((user) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email));

  const dedupedUsers = Array.from(
    new Map(partnerUsers.map((user) => [user.email.toLowerCase(), user])).values()
  );

  if (dedupedUsers.length === 0) {
    return { attempted: 0, sent: 0, skipped: 0, failed: 0, errors: ["No active owner/admin partner users found."] };
  }

  const account = accountRow as unknown as PartnerAccountForEmail;
  const invoiceUrl = `${input.origin}/partner/invoices`;
  const dueDate = invoice.due_date ? formatDate(invoice.due_date) : "not set";
  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = Boolean(invoice.due_date && invoice.due_date < today);
  const subject = isOverdue
    ? `Reminder: Legal Intake Flow invoice ${invoice.invoice_number} is overdue`
    : `Reminder: Legal Intake Flow invoice ${invoice.invoice_number}`;

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const user of dedupedUsers) {
    const name = displayName(user.first_name, user.last_name) ?? "Partner";
    const text = [
      `Hello ${name},`,
      "",
      `This is a reminder that invoice ${invoice.invoice_number} for ${account.firm_name} has a remaining balance.`,
      "",
      `Due Date: ${dueDate}`,
      `Total: ${currency(invoice.total_cents)}`,
      `Amount Paid: ${currency(invoice.amount_paid_cents)}`,
      `Balance Due: ${currency(invoice.balance_due_cents)}`,
      `Due Date: ${formatDate(invoice.due_date)}`,
      invoice.payment_instructions ? `Payment Instructions: ${invoice.payment_instructions}` : null,
      "",
      `View invoice details here: ${invoiceUrl}`,
      "",
      "This reminder is a billing notice only. It does not process payment or create an automatic charge.",
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
        <p>Hello ${escapeHtml(name)},</p>
        <p>This is a reminder that invoice <strong>${escapeHtml(invoice.invoice_number)}</strong> for <strong>${escapeHtml(account.firm_name)}</strong> has a remaining balance.</p>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;margin:16px 0;background:#f9fafb;">
          <p style="margin:0 0 6px 0;"><strong>Due Date:</strong> ${escapeHtml(dueDate)}${isOverdue ? ' <span style="color:#b91c1c;font-weight:600;">(overdue)</span>' : ""}</p>
          <p style="margin:0 0 6px 0;"><strong>Total:</strong> ${escapeHtml(currency(invoice.total_cents))}</p>
          <p style="margin:0 0 6px 0;"><strong>Amount Paid:</strong> ${escapeHtml(currency(invoice.amount_paid_cents))}</p>
          <p style="margin:0 0 6px 0;"><strong>Balance Due:</strong> ${escapeHtml(currency(invoice.balance_due_cents))}</p>
          <p style="margin:0;"><strong>Due Date:</strong> ${escapeHtml(formatDate(invoice.due_date))}</p>
        </div>
        ${invoice.payment_instructions ? `
          <div style="border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;background:#f0fdf4;">
            <p style="font-weight:600;margin:0 0 6px 0;">Payment instructions</p>
            <p style="margin:0;white-space:pre-wrap;">${escapeHtml(invoice.payment_instructions)}</p>
          </div>
        ` : ""}
        <p>
          <a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;background:#1a3a5c;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">
            View Invoice
          </a>
        </p>
        <p style="font-size:13px;color:#4b5563;">This reminder is a billing notice only. It does not process payment or create an automatic charge.</p>
      </div>
    `;

    const result = await sendTransactionalEmail({
      to: user.email,
      recipientName: name,
      subject,
      text,
      html,
      notificationType: "invoice_reminder",
      partnerAccountId: invoice.partner_account_id,
      partnerUserId: user.id,
      invoiceId: invoice.id,
      metadata: {
        invoice_number: invoice.invoice_number,
        due_date: invoice.due_date,
        total_cents: invoice.total_cents,
        balance_due_cents: invoice.balance_due_cents,
        reminder_count_before_send: invoice.reminder_count ?? 0,
      },
    });

    if (result.sent) sent += 1;
    else if (result.skipped) skipped += 1;
    else {
      failed += 1;
      if (result.error) errors.push(result.error);
    }
  }

  let invoiceSummary: { id: string; reminder_sent_at: string | null; reminder_count: number | null; overdue_marked_at: string | null } | null = null;

  if (sent > 0) {
    const now = new Date().toISOString();
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from("partner_billing_invoices")
      .update({
        reminder_sent_at: now,
        reminder_count: (invoice.reminder_count ?? 0) + 1,
        overdue_marked_at: isOverdue ? now : null,
      })
      .eq("id", input.invoiceId)
      .select("id, reminder_sent_at, reminder_count, overdue_marked_at")
      .single();

    if (updateError) {
      console.error("[sendInvoiceReminderNotifications] Failed to update invoice reminder summary:", updateError);
    } else if (updatedInvoice) {
      invoiceSummary = updatedInvoice as { id: string; reminder_sent_at: string | null; reminder_count: number | null; overdue_marked_at: string | null };
    }

    await supabaseAdmin.from("partner_billing_invoice_events").insert({
      invoice_id: input.invoiceId,
      event_type: "reminder_sent",
      previous_status: invoice.status,
      next_status: invoice.status,
      amount_cents: invoice.balance_due_cents,
      notes: `Reminder sent to ${sent} recipient${sent === 1 ? "" : "s"}.`,
      created_by: "admin",
    });
  }

  return {
    attempted: dedupedUsers.length,
    sent,
    skipped,
    failed,
    errors,
    invoice: invoiceSummary,
  };
}
