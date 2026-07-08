import tls from "tls";

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

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]*$/.test(value)) return value;
  return `=?UTF-8?B?${Buffer.from(value, "utf8").toString("base64")}?=`;
}

function formatAddress(email: string, name?: string | null) {
  const safeEmail = email.trim();
  const safeName = clean(name);
  if (!safeName) return `<${safeEmail}>`;
  return `"${safeName.replace(/"/g, "'")}" <${safeEmail}>`;
}

function normalizeNewlines(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function smtpCommand(socket: tls.TLSSocket, command: string, expected: number[]) {
  return new Promise<string>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`SMTP timeout while waiting for response to ${command.split(" ")[0]}.`));
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    }

    function onError(error: Error) {
      cleanup();
      reject(error);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] ?? "";
      if (!/^\d{3} /.test(lastLine)) return;
      const code = Number(lastLine.slice(0, 3));
      cleanup();
      if (!expected.includes(code)) {
        reject(new Error(`SMTP ${code}: ${buffer.trim()}`));
        return;
      }
      resolve(buffer);
    }

    socket.on("data", onData);
    socket.on("error", onError);
    socket.write(`${command}\r\n`);
  });
}

function waitForGreeting(socket: tls.TLSSocket) {
  return new Promise<void>((resolve, reject) => {
    let buffer = "";
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("SMTP timeout while waiting for greeting."));
    }, 20000);

    function cleanup() {
      clearTimeout(timer);
      socket.off("data", onData);
      socket.off("error", onError);
    }

    function onError(error: Error) {
      cleanup();
      reject(error);
    }

    function onData(chunk: Buffer) {
      buffer += chunk.toString("utf8");
      const lines = buffer.split(/\r?\n/).filter(Boolean);
      const lastLine = lines[lines.length - 1] ?? "";
      if (!/^\d{3} /.test(lastLine)) return;
      const code = Number(lastLine.slice(0, 3));
      cleanup();
      if (code !== 220) {
        reject(new Error(`SMTP ${code}: ${buffer.trim()}`));
        return;
      }
      resolve();
    }

    socket.on("data", onData);
    socket.on("error", onError);
  });
}

async function sendViaSmtp(input: {
  host: string;
  port: number;
  user: string;
  password: string;
  fromEmail: string;
  fromName: string | null;
  toEmail: string;
  toName: string | null;
  subject: string;
  text: string;
  html: string;
}) {
  const socket = tls.connect({ host: input.host, port: input.port, servername: input.host });
  await waitForGreeting(socket);

  const boundary = `lif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const messageId = `<lif-${Date.now()}-${Math.random().toString(36).slice(2)}@disabilitybenefitsscreening.com>`;
  const text = normalizeNewlines(input.text);
  const html = normalizeNewlines(input.html);
  const message = [
    `From: ${formatAddress(input.fromEmail, input.fromName)}`,
    `To: ${formatAddress(input.toEmail, input.toName)}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary=\"${boundary}\"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    text,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    html,
    "",
    `--${boundary}--`,
    ".",
  ].join("\r\n");

  try {
    await smtpCommand(socket, `EHLO legalintakeflow.com`, [250]);
    await smtpCommand(socket, "AUTH LOGIN", [334]);
    await smtpCommand(socket, Buffer.from(input.user, "utf8").toString("base64"), [334]);
    await smtpCommand(socket, Buffer.from(input.password, "utf8").toString("base64"), [235]);
    await smtpCommand(socket, `MAIL FROM:<${input.fromEmail}>`, [250]);
    await smtpCommand(socket, `RCPT TO:<${input.toEmail}>`, [250, 251]);
    await smtpCommand(socket, "DATA", [354]);
    await smtpCommand(socket, message, [250]);
    await smtpCommand(socket, "QUIT", [221]);
  } finally {
    socket.end();
  }

  return messageId;
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

  if (!Number.isFinite(smtpPort) || smtpPort !== 465) {
    return {
      sent: false,
      skipped: true,
      senderEmail: sender.email,
      senderName: sender.name,
      error: "Lead email outreach currently supports secure Gmail SMTP on port 465 only.",
    };
  }

  try {
    const html = `
      <div style="font-family: Arial, sans-serif; color: #0d1b2e; line-height: 1.5;">
        ${textToHtml(input.text)}
      </div>
    `;

    const providerMessageId = await sendViaSmtp({
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      password: smtpPassword,
      fromEmail: sender.email,
      fromName: sender.name,
      toEmail: input.to,
      toName: input.recipientName ?? null,
      subject: input.subject,
      text: input.text,
      html,
    });

    return {
      sent: true,
      skipped: false,
      providerMessageId,
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
