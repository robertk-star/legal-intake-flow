import { NextResponse } from "next/server";
import { rateLimitResponse } from "@/lib/rateLimit";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { assignBestMatchToLead, getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";

type DbsIngestResult = "created" | "duplicate" | "rejected" | "failed" | "received";

type DbsIngestEventInput = {
  externalReferenceId?: string | null;
  dbsReportNumber?: string | null;
  leadId?: string | null;
  result: DbsIngestResult;
  statusCode?: number | null;
  errorMessage?: string | null;
  consentGiven?: boolean | null;
  consentSource?: string | null;
  consentTimestamp?: string | null;
  receivedAt?: string | null;
  duplicate?: boolean;
  autoAssignmentEnabled?: boolean | null;
  autoAssignNewDbsLeads?: boolean | null;
  autoAssignmentResult?: unknown;
  assignedPartnerAccountId?: string | null;
  rawPayload?: Record<string, unknown> | null;
  responseSummary?: Record<string, unknown> | null;
};

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

async function logDbsIngestEvent(input: DbsIngestEventInput) {
  try {
    const { error } = await supabaseAdmin.from("dbs_ingest_events").insert({
      source: "disabilitybenefitsscreening",
      external_reference_id: input.externalReferenceId ?? null,
      dbs_report_number: input.dbsReportNumber ?? null,
      lif_lead_id: input.leadId ?? null,
      ingest_result: input.result,
      status_code: input.statusCode ?? null,
      error_message: input.errorMessage ?? null,
      consent_given: input.consentGiven ?? null,
      consent_source: input.consentSource ?? null,
      consent_timestamp: input.consentTimestamp ?? null,
      received_at: input.receivedAt ?? null,
      duplicate: input.duplicate ?? false,
      auto_assignment_enabled: input.autoAssignmentEnabled ?? null,
      auto_assign_new_dbs_leads: input.autoAssignNewDbsLeads ?? null,
      auto_assignment_result: input.autoAssignmentResult ?? null,
      assigned_partner_account_id: input.assignedPartnerAccountId ?? null,
      raw_payload: input.rawPayload ?? null,
      response_summary: input.responseSummary ?? null,
    });

    if (error) {
      console.warn("[POST /api/intake/ingest] Non-blocking DBS ingest audit insert failed:", error.message);
    }
  } catch (error) {
    console.warn("[POST /api/intake/ingest] Non-blocking DBS ingest audit insert threw:", error);
  }
}

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
    await logDbsIngestEvent({ result: "rejected", statusCode: 400, errorMessage: "Invalid JSON body." });
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    await logDbsIngestEvent({ result: "rejected", statusCode: 400, errorMessage: "Invalid JSON body." });
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const body = raw as Record<string, unknown>;

  // ── 3. Extract and sanitize accepted fields ─────────────────────────────────
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
    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      result: "rejected",
      statusCode: 400,
      errorMessage: "Missing required consent confirmation.",
      consentGiven: body.consent_given === true,
      consentSource,
      consentTimestamp: consentTimestamp === "invalid" ? null : consentTimestamp,
      receivedAt,
      rawPayload: body,
    });
    return NextResponse.json(
      { error: "Missing required consent confirmation." },
      { status: 400 }
    );
  }

  if (!externalReferenceId || !externalReferenceId.startsWith("dbs:")) {
    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      result: "rejected",
      statusCode: 400,
      errorMessage: "Missing required stable DBS external reference.",
      consentGiven: true,
      consentSource,
      consentTimestamp: consentTimestamp === "invalid" ? null : consentTimestamp,
      receivedAt,
      rawPayload: body,
    });
    return NextResponse.json(
      { error: "Missing required stable DBS external reference." },
      { status: 400 }
    );
  }

  if (consentTimestamp === "invalid") {
    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      result: "rejected",
      statusCode: 400,
      errorMessage: "Invalid consent timestamp.",
      consentGiven: true,
      consentSource,
      receivedAt,
      rawPayload: body,
    });
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
    .select("id, assigned_partner_account_id")
    .eq("source", "disabilitybenefitsscreening")
    .eq("external_reference_id", externalReferenceId)
    .maybeSingle();

  if (lookupError) {
    console.error("[POST /api/intake/ingest] Duplicate lookup error:", lookupError);
    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      result: "failed",
      statusCode: 500,
      errorMessage: "Failed to check for duplicate lead.",
      consentGiven: true,
      consentSource,
      consentTimestamp,
      receivedAt,
      rawPayload: body,
    });
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
      await logDbsIngestEvent({
        externalReferenceId,
        dbsReportNumber,
        leadId: existing.id,
        result: "failed",
        statusCode: 500,
        errorMessage: "Failed to update existing lead receipt metadata.",
        consentGiven: true,
        consentSource,
        consentTimestamp,
        receivedAt,
        duplicate: true,
        rawPayload: body,
      });
      return NextResponse.json(
        { error: "Failed to update existing lead receipt metadata." },
        { status: 500 }
      );
    }

    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      leadId: existing.id,
      result: "duplicate",
      statusCode: 200,
      consentGiven: true,
      consentSource,
      consentTimestamp,
      receivedAt,
      duplicate: true,
      rawPayload: body,
      assignedPartnerAccountId: (existing as { assigned_partner_account_id?: string | null }).assigned_partner_account_id ?? null,
      responseSummary: { success: true, leadId: existing.id, duplicate: true },
    });

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
    .select("id, assigned_partner_account_id")
    .single();

  if (error || !data) {
    const pgCode = (error as { code?: string } | null)?.code;
    if (pgCode === "23505") {
      const { data: duplicate } = await supabaseAdmin
        .from("leads")
        .select("id, assigned_partner_account_id")
        .eq("source", "disabilitybenefitsscreening")
        .eq("external_reference_id", externalReferenceId)
        .maybeSingle();

      if (duplicate) {
        await supabaseAdmin
          .from("leads")
          .update(receiptMetadata)
          .eq("id", duplicate.id);

        await logDbsIngestEvent({
          externalReferenceId,
          dbsReportNumber,
          leadId: duplicate.id,
          result: "duplicate",
          statusCode: 200,
          consentGiven: true,
          consentSource,
          consentTimestamp,
          receivedAt,
          duplicate: true,
          rawPayload: body,
          assignedPartnerAccountId: (duplicate as { assigned_partner_account_id?: string | null }).assigned_partner_account_id ?? null,
          responseSummary: { success: true, leadId: duplicate.id, duplicate: true, recoveredFromUniqueConstraint: true },
        });

        return NextResponse.json(
          { success: true, leadId: duplicate.id, duplicate: true },
          { status: 200 }
        );
      }
    }

    console.error("[POST /api/intake/ingest] Supabase insert error:", error);
    await logDbsIngestEvent({
      externalReferenceId,
      dbsReportNumber,
      result: "failed",
      statusCode: 500,
      errorMessage: "Failed to store lead.",
      consentGiven: true,
      consentSource,
      consentTimestamp,
      receivedAt,
      rawPayload: body,
    });
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

  const createdResponse = { success: true, leadId: data.id, autoAssignment };

  await logDbsIngestEvent({
    externalReferenceId,
    dbsReportNumber,
    leadId: data.id,
    result: "created",
    statusCode: 201,
    consentGiven: true,
    consentSource,
    consentTimestamp,
    receivedAt,
    duplicate: false,
    autoAssignmentEnabled: settings.auto_assignment_enabled,
    autoAssignNewDbsLeads: settings.auto_assign_new_dbs_leads,
    autoAssignmentResult: autoAssignment,
    assignedPartnerAccountId: (data as { assigned_partner_account_id?: string | null }).assigned_partner_account_id ?? null,
    rawPayload: body,
    responseSummary: createdResponse,
  });

  return NextResponse.json(createdResponse, { status: 201 });
}
