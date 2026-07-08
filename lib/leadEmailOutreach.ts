export type LeadEmailSendInput = {
  to: string;
  subject: string;
  text: string;
  recipientName?: string | null;
};

export type LeadEmailSendResult = {
  sent: boolean;
  skipped: boolean;
  providerMessageId?: string | null;
  error?: string | null;
  senderEmail?: string | null;
  senderName?: string | null;
};

function clean(value: string | undefined | null) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function leadEmailSender() {
  return {
    email: clean(process.env.LEAD_EMAIL_FROM) ?? clean(process.env.GMAIL_SMTP_USER) ?? "support@disabilitybenefitsscreening.com",
    name: clean(process.env.LEAD_EMAIL_FROM_NAME) ?? "Disability Benefits Screening",
  };
}

export function leadEmailConfigured() {
  return Boolean(clean(process.env.GMAIL_SMTP_USER) && clean(process.env.GMAIL_SMTP_APP_PASSWORD));
}

function escapeHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function textToHtml(text: string) {
  return escapeHtml(text)
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}

export async function sendLeadOutreachEmail(input: LeadEmailSendInput): Promise<LeadEmailSendResult> {
  const smtpUser = clean(process.env.GMAIL_SMTP_USER);
  const smtpPassword = clean(process.env.GMAIL_SMTP_APP_PASSWORD);
  const smtpHost = clean(process.env.GMAIL_SMTP_HOST) ?? "smtp.gmail.com";
  const smtpPort = Number(clean(process.env.GMAIL_SMTP_PORT) ?? "465");
  const sender = leadEmailSender();

  if (!smtpUser || !smtpPassword) {
    return {
      sent: false,
      skipped: true,
      senderEmail: sender.email,
      senderName: sender.name,
      error: "Lead email provider is not configured. Set GMAIL_SMTP_USER and GMAIL_SMTP_APP_PASSWORD in Vercel.",
    };
  }

  if (!Number.isFinite(smtpPort) || smtpPort <= 0) {
    return {
      sent: false,
      skipped: true,
      senderEmail: sender.email,
      senderName: sender.name,
      error: "Invalid GMAIL_SMTP_PORT value.",
    };
  }

  try {
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    });

    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
        ${textToHtml(input.text)}
      </div>
    `;

    const info = await transporter.sendMail({
      from: sender.name ? `\"${sender.name.replace(/\"/g, "'")}\" <${sender.email}>` : sender.email,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html,
      replyTo: sender.email,
    });

    return {
      sent: true,
      skipped: false,
      providerMessageId: typeof info.messageId === "string" ? info.messageId : null,
      senderEmail: sender.email,
      senderName: sender.name,
    };
  } catch (error) {
    return {
      sent: false,
      skipped: false,
      senderEmail: sender.email,
      senderName: sender.name,
      error: error instanceof Error ? error.message : "Unknown lead email delivery error.",
    };
  }
}
