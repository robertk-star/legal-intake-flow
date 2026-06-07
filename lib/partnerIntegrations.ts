import { supabaseAdmin } from "@/lib/supabaseAdmin";

const LEAD_SELECT =
  "id, created_at, updated_at, source, external_reference_id, dbs_report_number, " +
  "first_name, last_name, phone, email, city, state, zip, benefit_type, application_status, " +
  "medical_summary, additional_notes, status, assigned_partner_account_id, assigned_at, " +
  "partner_response_status, partner_response_updated_at, partner_viewed_at, partner_notes";

export interface PartnerIntegrationAccount {
  id: string;
  firm_name?: string | null;
  status?: string | null;
  api_access_enabled?: boolean | null;
  api_key_hash?: string | null;
  api_key_last_four?: string | null;
  api_key_created_at?: string | null;
  api_key_revoked_at?: string | null;
  webhook_enabled?: boolean | null;
  webhook_url?: string | null;
  webhook_secret?: string | null;
  webhook_last_sent_at?: string | null;
  webhook_last_status?: number | null;
  webhook_last_error?: string | null;
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPartnerApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `lifpk_${base64Url(bytes)}`;
}

export function createWebhookSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return `whsec_${base64Url(bytes)}`;
}

export async function hashPartnerApiKey(rawKey: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(rawKey));
  return Buffer.from(digest).toString("hex");
}

export async function signWebhookPayload(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(signature).toString("hex");
}

export function isValidWebhookUrl(value: string | null | undefined): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname) && url.hostname.includes(".");
  } catch {
    return false;
  }
}

export function normalizeWebhookUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    url.hostname = url.hostname.toLowerCase();
    return url.toString();
  } catch {
    return trimmed;
  }
}

export async function authenticatePartnerApiKey(rawKey: string): Promise<PartnerIntegrationAccount | null> {
  if (!rawKey || !rawKey.startsWith("lifpk_")) return null;
  const hash = await hashPartnerApiKey(rawKey);

  const { data, error } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, firm_name, status, api_access_enabled, api_key_hash, api_key_revoked_at")
    .eq("api_key_hash", hash)
    .eq("api_access_enabled", true)
    .is("api_key_revoked_at", null)
    .single();

  if (error || !data) return null;
  const account = data as PartnerIntegrationAccount;
  if (account.status !== "active" && account.status !== "pending") return null;
  return account;
}

export async function getPartnerAssignedLeadPayload(leadId: string, partnerAccountId: string) {
  const { data, error } = await supabaseAdmin
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", leadId)
    .eq("assigned_partner_account_id", partnerAccountId)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data;
}

export async function sendPartnerLeadWebhook(input: {
  leadId: string;
  partnerAccountId: string;
  eventType?: "lead.assigned" | "lead.reassigned";
}) {
  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("id, webhook_enabled, webhook_url, webhook_secret")
    .eq("id", input.partnerAccountId)
    .single();

  if (accountError || !account) {
    return { attempted: false, reason: "Partner account not found." };
  }

  const integration = account as PartnerIntegrationAccount;
  if (!integration.webhook_enabled || !integration.webhook_url) {
    return { attempted: false, reason: "Webhook is not enabled." };
  }

  if (!isValidWebhookUrl(integration.webhook_url)) {
    return { attempted: false, reason: "Webhook URL is invalid." };
  }

  const lead = await getPartnerAssignedLeadPayload(input.leadId, input.partnerAccountId);
  if (!lead) {
    return { attempted: false, reason: "Lead not found for partner." };
  }

  const payload = JSON.stringify({
    event: input.eventType ?? "lead.assigned",
    sent_at: new Date().toISOString(),
    partner_account_id: input.partnerAccountId,
    lead,
  });

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "LegalIntakeFlow-Webhooks/1.0",
    "x-lif-event": input.eventType ?? "lead.assigned",
    "x-lif-partner-account-id": input.partnerAccountId,
  };

  if (integration.webhook_secret) {
    headers["x-lif-signature"] = await signWebhookPayload(payload, integration.webhook_secret);
  }

  try {
    const response = await fetch(integration.webhook_url, {
      method: "POST",
      headers,
      body: payload,
      signal: AbortSignal.timeout(8000),
    });

    await supabaseAdmin
      .from("partner_accounts")
      .update({
        webhook_last_sent_at: new Date().toISOString(),
        webhook_last_status: response.status,
        webhook_last_error: response.ok ? null : `Webhook returned HTTP ${response.status}.`,
      })
      .eq("id", input.partnerAccountId);

    return { attempted: true, ok: response.ok, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook delivery failed.";
    await supabaseAdmin
      .from("partner_accounts")
      .update({
        webhook_last_sent_at: new Date().toISOString(),
        webhook_last_status: null,
        webhook_last_error: message.slice(0, 500),
      })
      .eq("id", input.partnerAccountId);

    return { attempted: true, ok: false, error: message };
  }
}
