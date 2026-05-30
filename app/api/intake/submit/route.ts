import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ── Valid option sets ─────────────────────────────────────────────────────────

const VALID_CONTACT_METHODS = ["phone", "email", "text"] as const;
const VALID_AGE_RANGES = ["under 18", "18–34", "35–49", "50–64", "65+"] as const;
const VALID_BENEFIT_TYPES = ["SSDI", "SSI", "Both", "Not Sure"] as const;
const VALID_APPLICATION_STATUSES = [
  "Have not applied yet",
  "Application pending",
  "Denied",
  "Appeal in progress",
  "Hearing scheduled",
  "Not sure",
] as const;
const VALID_HAS_ATTORNEY = ["yes", "no", "not sure"] as const;

// ── US State abbreviations ────────────────────────────────────────────────────

const US_STATES = new Set([
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
  "DC","PR","GU","VI","AS","MP",
]);

/**
 * POST /api/intake/submit
 *
 * Public endpoint — no auth required.
 * Creates a new lead row in public.leads.
 *
 * Honeypot: if `website_url` (hidden field) is filled, silently return success
 * without inserting to block bots.
 *
 * No email is sent. No automatic partner matching. No billing.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  // ── Honeypot anti-spam ────────────────────────────────────────────────────
  if (body.website_url && String(body.website_url).trim() !== "") {
    // Silently succeed — do not reveal honeypot to bots
    return NextResponse.json({ success: true });
  }

  // ── Extract and normalize fields ──────────────────────────────────────────
  const firstName  = String(body.first_name  ?? "").trim();
  const lastName   = String(body.last_name   ?? "").trim();
  const phone      = String(body.phone       ?? "").trim();
  const email      = String(body.email       ?? "").trim().toLowerCase() || null;
  const city       = String(body.city        ?? "").trim() || null;
  const state      = String(body.state       ?? "").trim().toUpperCase();
  const zip        = String(body.zip         ?? "").trim() || null;

  const preferredContactMethod = String(body.preferred_contact_method ?? "").trim() || null;
  const livesInUs  = body.lives_in_us === true || body.lives_in_us === "yes" ? true
                   : body.lives_in_us === false || body.lives_in_us === "no" ? false
                   : null;
  const ageRange   = String(body.age_range   ?? "").trim() || null;
  const benefitType = String(body.benefit_type ?? "").trim() || null;
  const applicationStatus = String(body.application_status ?? "").trim() || null;
  const medicalSummary = String(body.medical_summary ?? "").trim() || null;
  const hasAttorney = String(body.has_attorney ?? "").trim() || null;
  const additionalNotes = String(body.additional_notes ?? "").trim() || null;
  const consentGiven = body.consent_given === true;

  // ── Required field validation ─────────────────────────────────────────────
  const errors: string[] = [];

  if (!firstName) errors.push("First name is required.");
  if (!lastName)  errors.push("Last name is required.");
  if (!phone)     errors.push("Phone number is required.");
  if (!state)     errors.push("State is required.");
  if (!consentGiven) errors.push("You must agree to be contacted to submit this form.");

  // Email format (optional field)
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid email address.");
  }

  // State validation
  if (state && !US_STATES.has(state)) {
    errors.push("Select a valid U.S. state.");
  }

  // Enum validations (only if provided)
  if (preferredContactMethod && !VALID_CONTACT_METHODS.includes(preferredContactMethod as typeof VALID_CONTACT_METHODS[number])) {
    errors.push("Invalid preferred contact method.");
  }
  if (ageRange && !VALID_AGE_RANGES.includes(ageRange as typeof VALID_AGE_RANGES[number])) {
    errors.push("Invalid age range.");
  }
  if (benefitType && !VALID_BENEFIT_TYPES.includes(benefitType as typeof VALID_BENEFIT_TYPES[number])) {
    errors.push("Invalid benefit type.");
  }
  if (applicationStatus && !VALID_APPLICATION_STATUSES.includes(applicationStatus as typeof VALID_APPLICATION_STATUSES[number])) {
    errors.push("Invalid application status.");
  }
  if (hasAttorney && !VALID_HAS_ATTORNEY.includes(hasAttorney as typeof VALID_HAS_ATTORNEY[number])) {
    errors.push("Invalid attorney status.");
  }

  if (errors.length > 0) {
    return NextResponse.json(
      { success: false, errors },
      { status: 422 }
    );
  }

  // ── Insert lead ───────────────────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      first_name:               firstName,
      last_name:                lastName,
      phone,
      email,
      city,
      state,
      zip,
      preferred_contact_method: preferredContactMethod,
      lives_in_us:              livesInUs,
      age_range:                ageRange,
      benefit_type:             benefitType,
      application_status:       applicationStatus,
      medical_summary:          medicalSummary,
      has_attorney:             hasAttorney,
      additional_notes:         additionalNotes,
      consent_given:            consentGiven,
      status:                   "new",
    })
    .select("id")
    .single();

  if (error || !data) {
    console.error("[POST /api/intake/submit] Insert error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit your information. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, leadId: data.id }, { status: 201 });
}
