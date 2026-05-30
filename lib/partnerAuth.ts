import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ── Constants ─────────────────────────────────────────────────────────────────

export const PARTNER_COOKIE_NAME = "lif_partner_session";
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
export const THIRTY_DAYS_SECONDS = 30 * 24 * 60 * 60;

// ── Signing secret ────────────────────────────────────────────────────────────
// Server-only. Never referenced in client components.

function getSigningSecret(): string {
  const secret = process.env.LIF_PARTNER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "[partnerAuth] Missing environment variable: LIF_PARTNER_SESSION_SECRET"
    );
  }

  return secret;
}

// ── HMAC SHA-256 helpers ──────────────────────────────────────────────────────

async function hmacSign(payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(
  payload: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expected = await hmacSign(payload, secret);
  if (expected.length !== signature.length) return false;
  // Constant-time comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

// ── Token format ──────────────────────────────────────────────────────────────
// <partnerAccountId>.<issuedAt>.<expiresAt>.<signature>
// partnerAccountId is a UUID (no dots), issuedAt and expiresAt are ms timestamps.

async function createToken(partnerAccountId: string): Promise<string> {
  const secret = getSigningSecret();
  const issuedAt = Date.now();
  const expiresAt = issuedAt + THIRTY_DAYS_MS;
  const payload = `${partnerAccountId}.${issuedAt}.${expiresAt}`;
  const signature = await hmacSign(payload, secret);
  return `${payload}.${signature}`;
}

interface VerifiedPartnerToken {
  partnerAccountId: string;
  issuedAt: number;
  expiresAt: number;
}

async function verifyToken(token: string): Promise<VerifiedPartnerToken | null> {
  // Format: <uuid>.<issuedAt>.<expiresAt>.<signature>
  // UUID has 4 dashes but we split on "." so we need exactly 4 parts
  const parts = token.split(".");
  if (parts.length !== 4) return null;

  const [partnerAccountId, issuedAtStr, expiresAtStr, signature] = parts;
  const issuedAt = parseInt(issuedAtStr, 10);
  const expiresAt = parseInt(expiresAtStr, 10);

  if (!partnerAccountId || isNaN(issuedAt) || isNaN(expiresAt)) return null;

  // Check expiration
  if (Date.now() > expiresAt) return null;

  // Verify signature
  const secret = getSigningSecret();
  const payload = `${partnerAccountId}.${issuedAtStr}.${expiresAtStr}`;
  const valid = await hmacVerify(payload, signature, secret);
  if (!valid) return null;

  return { partnerAccountId, issuedAt, expiresAt };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a signed 30-day partner session token for the given partner account ID.
 */
export async function createPartnerSessionToken(partnerAccountId: string): Promise<string> {
  return createToken(partnerAccountId);
}

/**
 * Verify the partner session cookie server-side.
 * Checks: format, signature, expiration, account exists, account status is active or pending.
 * Returns the partner account ID if valid, or null if invalid/expired/inactive.
 */
export async function getAuthenticatedPartnerId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(PARTNER_COOKIE_NAME);
    if (!session?.value) return null;

    const verified = await verifyToken(session.value);
    if (!verified) return null;

    // Confirm account still exists and is in an allowed status
    const { data, error } = await supabaseAdmin
      .from("partner_accounts")
      .select("id, status")
      .eq("id", verified.partnerAccountId)
      .single();

    if (error || !data) return null;
    if (data.status !== "active" && data.status !== "pending") return null;

    return data.id as string;
  } catch {
    return null;
  }
}

/**
 * SHA-256 hash a raw token string for storage in partner_login_tokens.
 * The raw token is never stored — only this hash.
 */
export async function hashLoginToken(rawToken: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(rawToken));
  return Buffer.from(buf).toString("hex");
}
