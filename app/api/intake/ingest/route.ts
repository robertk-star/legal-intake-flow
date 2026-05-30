import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/intake/ingest
 *
 * Secure DBS-to-LIF lead ingestion endpoint.
 *
 * Authentication:
 *   Header: x-lif-ingest-secret: <LIF_DBS_INGEST_SECRET>
 *
 * Accepted payload (all fields optional except secret header):
 *   external_reference_id  — DBS lead ID for cross-reference (used for duplicate detection)
 *   first_name
 *   last_name
 *   phone
 *   email
 *   city
 *   state
 *   zip
 *   benefit_type           — e.g. "SSDI", "SSI", "Both", "Not Sure"
 *   application_status     — e.g. "Have not applied yet", "Application pending", "Denied"
 *   medical_summary
 *   additional_notes
 *
 * Behavior:
 *   - Rejects requests missing or with incorrect x-lif-ingest-secret header (401)
 *   - Rejects non-object JSON bodies (null, arrays, primitives) with 400
 *   - If external_reference_id is provided and a lead already exists for that
 *     (source, external_reference_id) pair, returns the existing lead id with
 *     { success: true, leadId, duplicate: true } — no duplicate is created.
 *   - Stores raw_payload (full incoming JSON) for audit/debugging
 *   - Sets source = 'disabilitybenefitsscreening'
 *   - Sets status = 'new'
 *   - Does NOT assign partner automatically
 *   - Does NOT send any emails
 *   - Returns { success: true, leadId } on new creation (HTTP 201)
 *   - Returns { success: true, leadId, duplicate: true } on duplicate (HTTP 200)
 */
export async function POST(request: Request) {
  // ── 1. Authenticate via shared secret ──────────────────────────────────────
  const ingestSecret = process.env.LIF_DBS_INGEST_SECRET;

  if (!ingestSecret) {
    console.error("[POST /api/intake/ingest] LIF_DBS_INGEST_SECRET is not set.");
    return NextResponse.json(
      { error: "Service unavailable." },
      { status: 503 }
    );
  }

  const providedSecret = request.headers.get("x-lif-ingest-secret");
  if (!providedSecret || providedSecret !== ingestSecret) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  // Validate that the body is a plain object (not null, array, or primitive)
  if (
    raw === null ||
    typeof raw !== "object" ||
    Array.isArray(raw)
  ) {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const body = raw as Record<string, unknown>;

  // ── 3. Extract and sanitize accepted fields ─────────────────────────────────
  function str(val: unknown): string | null {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length > 0 ? s : null;
  }

  const externalReferenceId = str(body.external_reference_id);
  const firstName           = str(body.first_name);
  const lastName            = str(body.last_name);
  const phone               = str(body.phone);
  const email               = str(body.email);
  const city                = str(body.city);
  const state               = str(body.state);
  const zip                 = str(body.zip);
  const benefitType         = str(body.benefit_type);
  const applicationStatus   = str(body.application_status);
  const medicalSummary      = str(body.medical_summary);
  const additionalNotes     = str(body.additional_notes);

  // ── 4. Duplicate detection ──────────────────────────────────────────────────
  // If external_reference_id is provided, check whether a lead with the same
  // (source, external_reference_id) already exists before attempting an insert.
  // The unique partial index in section08_dbs_lead_ingestion.sql enforces this
  // at the database level too, but we check here first to return a clean response.
  if (externalReferenceId) {
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("leads")
      .select("id")
      .eq("source", "disabilitybenefitsscreening")
      .eq("external_reference_id", externalReferenceId)
      .maybeSingle();

    if (lookupError) {
      console.error("[POST /api/intake/ingest] Duplicate lookup error:", lookupError);
      return NextResponse.json(
        { error: "Failed to check for duplicate lead." },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: true, leadId: existing.id, duplicate: true },
        { status: 200 }
      );
    }
  }

  // ── 5. Insert into public.leads ─────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      source:                      "disabilitybenefitsscreening",
      external_reference_id:       externalReferenceId,
      first_name:                  firstName,
      last_name:                   lastName,
      phone:                       phone,
      email:                       email,
      city:                        city,
      state:                       state,
      zip:                         zip,
      benefit_type:                benefitType,
      application_status:          applicationStatus,
      medical_summary:             medicalSummary,
      additional_notes:            additionalNotes,
      status:                      "new",
      raw_payload:                 body,
      assigned_partner_account_id: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    // ── 5a. Recover from database-level duplicate-key violation ────────────────
    // Postgres unique constraint violations return code "23505".
    // If we hit this (e.g. race condition), look up and return the existing lead.
    const pgCode = (error as { code?: string } | null)?.code;
    if (pgCode === "23505" && externalReferenceId) {
      const { data: existing } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("source", "disabilitybenefitsscreening")
        .eq("external_reference_id", externalReferenceId)
        .maybeSingle();

      if (existing) {
        return NextResponse.json(
          { success: true, leadId: existing.id, duplicate: true },
          { status: 200 }
        );
      }
    }

    console.error("[POST /api/intake/ingest] Supabase insert error:", error);
    return NextResponse.json(
      { error: "Failed to store lead." },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { success: true, leadId: data.id },
    { status: 201 }
  );
}
