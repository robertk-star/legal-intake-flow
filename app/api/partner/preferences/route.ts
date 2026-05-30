import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedPartnerId } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ── Constants ─────────────────────────────────────────────────────────────────

const VALID_LEAD_STATUSES = ["active", "paused", "at_capacity"] as const;
type LeadStatus = typeof VALID_LEAD_STATUSES[number];

// accepted_case_types stores benefit program tags only (SSDI / SSI).
// Case stage preferences (appeals, hearings, etc.) are stored in the
// boolean columns: accepts_initial_filings, accepts_appeals,
// accepts_hearings, accepts_child_cases.
const VALID_CASE_TYPES = [
  "SSDI",
  "SSI",
] as const;

const VALID_LANGUAGES = ["English", "Spanish"] as const;

// ── PATCH /api/partner/preferences ────────────────────────────────────────────

/**
 * Updates the authenticated partner's intake preferences.
 * Only updates the preference fields — never touches profile fields
 * (firm_name, email, phone, etc.) or account status.
 */
export async function PATCH(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const partnerId = await getAuthenticatedPartnerId();

  if (!partnerId) {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Please log in again." },
      { status: 401 }
    );
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { success: false, error: "Request body must be a JSON object." },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;

  // ── Validate fields ─────────────────────────────────────────────────────────
  const errors: string[] = [];

  // accepting_leads — boolean required
  if (typeof raw.accepting_leads !== "boolean") {
    errors.push("accepting_leads must be a boolean.");
  }

  // lead_status — must be one of the allowed values
  if (!VALID_LEAD_STATUSES.includes(raw.lead_status as LeadStatus)) {
    errors.push(`lead_status must be one of: ${VALID_LEAD_STATUSES.join(", ")}.`);
  }

  // monthly_lead_capacity — non-empty string
  if (typeof raw.monthly_lead_capacity !== "string" || !raw.monthly_lead_capacity.trim()) {
    errors.push("monthly_lead_capacity must be a non-empty string.");
  }

  // accepted_case_types — array of valid strings (can be empty)
  if (!Array.isArray(raw.accepted_case_types)) {
    errors.push("accepted_case_types must be an array.");
  } else {
    const invalid = (raw.accepted_case_types as unknown[]).filter(
      (v) => !VALID_CASE_TYPES.includes(v as typeof VALID_CASE_TYPES[number])
    );
    if (invalid.length > 0) {
      errors.push(`accepted_case_types contains invalid values: ${invalid.join(", ")}.`);
    }
  }

  // accepted_languages — array of valid strings (can be empty)
  if (!Array.isArray(raw.accepted_languages)) {
    errors.push("accepted_languages must be an array.");
  } else {
    const invalid = (raw.accepted_languages as unknown[]).filter(
      (v) => !VALID_LANGUAGES.includes(v as typeof VALID_LANGUAGES[number])
    );
    if (invalid.length > 0) {
      errors.push(`accepted_languages contains invalid values: ${invalid.join(", ")}.`);
    }
  }

  // Boolean flags
  for (const flag of [
    "accepts_initial_filings",
    "accepts_appeals",
    "accepts_hearings",
    "accepts_child_cases",
  ] as const) {
    if (typeof raw[flag] !== "boolean") {
      errors.push(`${flag} must be a boolean.`);
    }
  }

  // lead_notes — optional string or null
  if (raw.lead_notes !== null && raw.lead_notes !== undefined && typeof raw.lead_notes !== "string") {
    errors.push("lead_notes must be a string or null.");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, error: "Validation failed.", details: errors },
      { status: 422 }
    );
  }

  // ── Build update payload ─────────────────────────────────────────────────────
  const update = {
    accepting_leads:         raw.accepting_leads as boolean,
    lead_status:             raw.lead_status as LeadStatus,
    monthly_lead_capacity:   (raw.monthly_lead_capacity as string).trim(),
    accepted_case_types:     raw.accepted_case_types as string[],
    accepted_languages:      raw.accepted_languages as string[],
    accepts_initial_filings: raw.accepts_initial_filings as boolean,
    accepts_appeals:         raw.accepts_appeals as boolean,
    accepts_hearings:        raw.accepts_hearings as boolean,
    accepts_child_cases:     raw.accepts_child_cases as boolean,
    lead_notes:              raw.lead_notes
                               ? (raw.lead_notes as string).trim() || null
                               : null,
  };

  // ── Update partner_accounts ──────────────────────────────────────────────────
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("partner_accounts")
    .update(update)
    .eq("id", partnerId)
    .select(
      "id, accepting_leads, lead_status, monthly_lead_capacity, " +
      "accepted_case_types, accepted_languages, " +
      "accepts_initial_filings, accepts_appeals, accepts_hearings, accepts_child_cases, " +
      "lead_notes"
    )
    .single();

  if (updateError || !updated) {
    console.error("[PATCH /api/partner/preferences] Update error:", updateError);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to save preferences. Please try again.",
        supabaseCode:    updateError?.code    ?? null,
        supabaseMessage: updateError?.message ?? null,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: updated });
}
