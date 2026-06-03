import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { getLeadAssignmentSettings } from "@/lib/leadAssignmentEngine";

type IngestEventRow = {
  id: string;
  created_at: string;
  source: string;
  external_reference_id: string | null;
  dbs_report_number: string | null;
  lif_lead_id: string | null;
  ingest_result: string;
  status_code: number | null;
  error_message: string | null;
  consent_given: boolean | null;
  consent_source: string | null;
  consent_timestamp: string | null;
  received_at: string | null;
  duplicate: boolean | null;
  is_dry_run: boolean | null;
  dry_run_result: string | null;
  dry_run_checked_at: string | null;
  raw_payload_summary: Record<string, unknown> | null;
  auto_assignment_enabled: boolean | null;
  auto_assign_new_dbs_leads: boolean | null;
  assigned_partner_account_id: string | null;
  response_summary: Record<string, unknown> | null;
};

type LeadRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  source: string | null;
  external_reference_id: string | null;
  dbs_report_number: string | null;
  dbs_consent_given: boolean | null;
  dbs_consent_source: string | null;
  dbs_consent_timestamp: string | null;
  dbs_received_at: string | null;
  status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  deleted_at: string | null;
};

function countBy<T extends string | null | undefined>(items: Array<T>) {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key = item || "unknown";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);
  const search = searchParams.get("search")?.trim() ?? "";
  const resultFilter = searchParams.get("result")?.trim() ?? "";
  const dryRunFilter = searchParams.get("dry_run")?.trim() ?? "";
  const consentFilter = searchParams.get("consent")?.trim() ?? "";

  const warnings: string[] = [];
  const { settings, warning: settingsWarning } = await getLeadAssignmentSettings();
  if (settingsWarning) warnings.push(settingsWarning);

  let eventsQuery = supabaseAdmin
    .from("dbs_ingest_events")
    .select(
      "id, created_at, source, external_reference_id, dbs_report_number, lif_lead_id, " +
      "ingest_result, status_code, error_message, consent_given, consent_source, " +
      "consent_timestamp, received_at, duplicate, is_dry_run, dry_run_result, " +
      "dry_run_checked_at, raw_payload_summary, auto_assignment_enabled, " +
      "auto_assign_new_dbs_leads, assigned_partner_account_id, response_summary"
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (resultFilter && resultFilter !== "all") {
    eventsQuery = eventsQuery.eq("ingest_result", resultFilter);
  }

  if (dryRunFilter === "true") {
    eventsQuery = eventsQuery.eq("is_dry_run", true);
  } else if (dryRunFilter === "false") {
    eventsQuery = eventsQuery.eq("is_dry_run", false);
  }

  if (consentFilter === "yes") {
    eventsQuery = eventsQuery.eq("consent_given", true);
  } else if (consentFilter === "no") {
    eventsQuery = eventsQuery.or("consent_given.is.null,consent_given.eq.false");
  }

  if (search) {
    eventsQuery = eventsQuery.or(
      `external_reference_id.ilike.%${search}%,dbs_report_number.ilike.%${search}%`
    );
  }

  const eventsResult = await eventsQuery;
  let events: IngestEventRow[] = [];
  if (eventsResult.error) {
    warnings.push(`dbs_ingest_events: ${eventsResult.error.message}`);
  } else {
    events = (eventsResult.data ?? []) as unknown as IngestEventRow[];
  }

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, updated_at, source, external_reference_id, dbs_report_number, " +
      "dbs_consent_given, dbs_consent_source, dbs_consent_timestamp, dbs_received_at, " +
      "status, assigned_partner_account_id, assigned_at, partner_response_status, deleted_at"
    )
    .eq("source", "disabilitybenefitsscreening")
    .order("dbs_received_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (consentFilter === "yes") {
    leadsQuery = leadsQuery.eq("dbs_consent_given", true);
  } else if (consentFilter === "no") {
    leadsQuery = leadsQuery.or("dbs_consent_given.is.null,dbs_consent_given.eq.false");
  }

  if (search) {
    leadsQuery = leadsQuery.or(
      `external_reference_id.ilike.%${search}%,dbs_report_number.ilike.%${search}%`
    );
  }

  const leadsResult = await leadsQuery;
  let leads: LeadRow[] = [];
  if (leadsResult.error) {
    warnings.push(`leads: ${leadsResult.error.message}`);
  } else {
    leads = (leadsResult.data ?? []) as unknown as LeadRow[];
  }

  const activeLeads = leads.filter((lead) => !lead.deleted_at);
  const eventCounts = countBy(events.map((event) => event.ingest_result));
  const leadStatusCounts = countBy(activeLeads.map((lead) => lead.status));

  const rejectedEvents = events.filter((event) => event.ingest_result === "rejected" || event.dry_run_result === "would_reject").length;
  const failedEvents = events.filter((event) => event.ingest_result === "failed" || event.dry_run_result === "would_fail_validation").length;
  const duplicateEvents = events.filter((event) => event.ingest_result === "duplicate" || event.dry_run_result === "would_duplicate").length;
  const dryRunEvents = events.filter((event) => event.is_dry_run === true || event.ingest_result === "dry_run").length;
  const assignedLeads = activeLeads.filter((lead) => Boolean(lead.assigned_partner_account_id)).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    warnings,
    configuration: {
      endpoint: "/api/intake/ingest",
      lifDbsIngestSecretConfigured: Boolean(process.env.LIF_DBS_INGEST_SECRET),
      lifAppUrlConfigured: Boolean(process.env.LIF_APP_URL),
      autoAssignmentEnabled: settings.auto_assignment_enabled,
      autoAssignNewDbsLeads: settings.auto_assign_new_dbs_leads,
      notifyPartnerOnAutoAssignment: settings.notify_partner_on_auto_assignment,
      minimumRoutingScore: settings.minimum_score,
      requireZeroBlockers: settings.require_no_blockers,
    },
    summary: {
      recentEvents: events.length,
      recentDbsLeads: activeLeads.length,
      createdEvents: eventCounts.created ?? 0,
      duplicateEvents,
      dryRunEvents,
      rejectedEvents,
      failedEvents,
      assignedLeads,
      unassignedLeads: activeLeads.length - assignedLeads,
      consentedLeads: activeLeads.filter((lead) => lead.dbs_consent_given === true).length,
      missingConsentLeads: activeLeads.filter((lead) => lead.dbs_consent_given !== true).length,
    },
    counts: {
      ingestResults: eventCounts,
      leadStatuses: leadStatusCounts,
    },
    events,
    leads: activeLeads,
  });
}
