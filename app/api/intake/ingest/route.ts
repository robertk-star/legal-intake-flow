import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assignBestMatchToLead, getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";

/**
 * POST /api/intake/ingest
 *
 * Secure DBS-to-LIF lead ingestion endpoint.
 *
 * Authentication:
 *   Header: x-lif-ingest-secret: <LIF_DBS_INGEST_SECRET>
 *
 * DBS handoff requirements:
 *   consent_given must be true
 *   external_reference_id must be stable and start with "dbs:"
 *   dbs_report_number is display/search metadata only, never the duplicate key
 *
 * Duplicate detection:
 *   source + external_reference_id is the duplicate key. If DBS sends the same
 *   lead again, LIF returns the existing LIF lead ID and updates receipt metadata
 *   without creating a duplicate or changing the original created_at.
 */
export async function POST(request: Request) {
  const limited = rateLimitResponse(request, { keyPrefix: "dbs-ingest", limit: 120, windowMs: 60 * 1000 });
  if (limited) return limited;

  // ── 1. Authenticate via shared secret ──────────────────────────────────────
  const ingestSecret = process.env.LIF_DBS_INGEST_SECRET;

  if (!ingestSecret) {
    console.error("[POST /api/intake/ingest] LIF_DBS_INGEST_SECRET is not set.");
    return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  }

  const providedSecret = request.headers.get("x-lif-ingest-secret");
  if (!providedSecret || providedSecret !== ingestSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  // ── 2. Parse body ───────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;

  // ── 3. Extract and sanitize accepted fields ─────────────────────────────────
  function str(val: unknown): string | null {
    if (val === null || val === undefined) return null;
    const s = String(val).trim();
    return s.length > 0 ? s : null;
  }

  function parseOptionalTimestamp(val: unknown): string | null | "invalid" {
    const value = str(val);
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "invalid";
    return date.toISOString();
  }

  const externalReferenceId = str(body.external_reference_id);
  const dbsReportNumber     = str(body.dbs_report_number) ?? str(body.report_number);
  const firstName           = str(body.first_name);
  const lastName            = str(body.last_name);
  const phone               = str(body.phone);
  const email               = str(body.email);
  const city                = str(body.city);
  const state               = str(body.state)?.toUpperCase() ?? null;
  const zip                 = str(body.zip);
  const benefitType         = str(body.benefit_type);
  const applicationStatus   = str(body.application_status);
  const medicalSummary      = str(body.medical_summary);
  const additionalNotes     = str(body.additional_notes);
  const consentSource       = str(body.consent_source);
  const consentTimestamp    = parseOptionalTimestamp(body.consent_timestamp);
  const receivedAt          = new Date().toISOString();

  // ── 4. DBS receipt validation ──────────────────────────────────────────────
  if (body.consent_given !== true) {
    return NextResponse.json(
      { error: "Missing required consent confirmation." },
      { status: 400 }
    );
  }

  if (!externalReferenceId || !externalReferenceId.startsWith("dbs:")) {
    return NextResponse.json(
      { error: "Missing required stable DBS external reference." },
      { status: 400 }
    );
  }

  if (consentTimestamp === "invalid") {
    return NextResponse.json(
      { error: "Invalid consent timestamp." },
      { status: 400 }
    );
  }

  const receiptMetadata = {
    dbs_report_number: dbsReportNumber,
    consent_given: true,
    dbs_consent_given: true,
    dbs_consent_source: consentSource,
    dbs_consent_timestamp: consentTimestamp,
    dbs_received_at: receivedAt,
    raw_payload: body,
  };

  // ── 5. Duplicate detection ─────────────────────────────────────────────────
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
    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update(receiptMetadata)
      .eq("id", existing.id);

    if (updateError) {
      console.error("[POST /api/intake/ingest] Duplicate metadata update error:", updateError);
      return NextResponse.json(
        { error: "Failed to update existing lead receipt metadata." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, leadId: existing.id, duplicate: true },
      { status: 200 }
    );
  }

  // ── 6. Insert into public.leads ─────────────────────────────────────────────
  const { data, error } = await supabaseAdmin
    .from("leads")
    .insert({
      source:                      "disabilitybenefitsscreening",
      external_reference_id:       externalReferenceId,
      dbs_report_number:           dbsReportNumber,
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
      consent_given:               true,
      dbs_consent_given:           true,
      dbs_consent_source:          consentSource,
      dbs_consent_timestamp:       consentTimestamp,
      dbs_received_at:             receivedAt,
      raw_payload:                 body,
      assigned_partner_account_id: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    const pgCode = (error as { code?: string } | null)?.code;
    if (pgCode === "23505") {
      const { data: duplicate } = await supabaseAdmin
        .from("leads")
        .select("id")
        .eq("source", "disabilitybenefitsscreening")
        .eq("external_reference_id", externalReferenceId)
        .maybeSingle();

      if (duplicate) {
        await supabaseAdmin
          .from("leads")
          .update(receiptMetadata)
          .eq("id", duplicate.id);

        return NextResponse.json(
          { success: true, leadId: duplicate.id, duplicate: true },
          { status: 200 }
        );
      }
    }

    console.error("[POST /api/intake/ingest] Supabase insert error:", error);
    return NextResponse.json({ error: "Failed to store lead." }, { status: 500 });
  }

  // ── 7. Optional controlled auto-assignment ─────────────────────────────────
  const { settings } = await getLeadAssignmentSettings();
  let autoAssignment: unknown = null;

  if (settings.auto_assignment_enabled && settings.auto_assign_new_dbs_leads) {
    autoAssignment = await assignBestMatchToLead({
      leadId: data.id,
      origin: process.env.LIF_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin,
      assignmentType: "auto_ingest",
      assignedBy: "system:dbs_ingest",
      settings,
      notifyPartner: settings.notify_partner_on_auto_assignment,
    });
  }

  return NextResponse.json(
    { success: true, leadId: data.id, autoAssignment },
    { status: 201 }
  );
}
