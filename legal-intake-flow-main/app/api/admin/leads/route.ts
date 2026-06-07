import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * GET /api/admin/leads
 *
 * Returns a paginated list of DBS-ingested leads for the admin lead queue.
 *
 * Query params:
 *   ?search=<text>          — ilike on first_name, last_name, email, phone, external_reference_id
 *   ?state=<abbr>           — exact match on state
 *   ?benefit_type=<type>    — exact match on benefit_type
 *   ?status=<status>        — exact match on status
 *   ?assigned=true|false    — filter by whether assigned_partner_account_id is set
 *   ?source=dbs|other|all   — filter DBS-ingested leads, non-DBS leads, or all
 *   ?latest_ingest_result=<result> — filter by latest DBS ingest event result after fetching
 *   ?limit=<n>              — max results (default 50, max 200)
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search         = searchParams.get("search")?.trim() ?? "";
  const stateFilter    = searchParams.get("state")?.trim().toUpperCase() ?? "";
  const benefitFilter  = searchParams.get("benefit_type")?.trim() ?? "";
  const statusFilter   = searchParams.get("status")?.trim() ?? "";
  const assignedFilter = searchParams.get("assigned")?.trim() ?? "";
  const sourceFilter   = searchParams.get("source")?.trim() ?? "";
  const ingestResultFilter = searchParams.get("latest_ingest_result")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10) || 50, 200);

  let query = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, updated_at, source, external_reference_id, dbs_report_number, " +
      "dbs_consent_given, dbs_received_at, first_name, last_name, phone, email, city, state, zip, " +
      "benefit_type, application_status, status, " +
      "assigned_partner_account_id, assigned_at, partner_response_status, partner_response_updated_at"
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  // Search across name, email, phone, external_reference_id
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,` +
      `email.ilike.%${search}%,phone.ilike.%${search}%,` +
      `external_reference_id.ilike.%${search}%,dbs_report_number.ilike.%${search}%`
    );
  }

  // Exact filters
  if (stateFilter)   query = query.eq("state", stateFilter);
  if (benefitFilter) query = query.eq("benefit_type", benefitFilter);
  if (statusFilter)  query = query.eq("status", statusFilter);
  if (sourceFilter === "dbs") query = query.eq("source", "disabilitybenefitsscreening");
  if (sourceFilter === "other") query = query.neq("source", "disabilitybenefitsscreening");

  // Assigned / unassigned filter
  if (assignedFilter === "true") {
    query = query.not("assigned_partner_account_id", "is", null);
  } else if (assignedFilter === "false") {
    query = query.is("assigned_partner_account_id", null);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/admin/leads] Supabase error:", error);
    return NextResponse.json({ error: "Failed to fetch leads." }, { status: 500 });
  }

  const leads = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const leadIds = leads.map((lead) => String(lead.id)).filter(Boolean);
  const dbsExternalRefs = leads
    .map((lead) => typeof lead.external_reference_id === "string" ? lead.external_reference_id : null)
    .filter((ref): ref is string => Boolean(ref && ref.startsWith("dbs:")));

  const latestIngestByRef = new Map<string, Record<string, unknown>>();
  if (dbsExternalRefs.length > 0) {
    const { data: events, error: eventsError } = await supabaseAdmin
      .from("dbs_ingest_events")
      .select("external_reference_id, ingest_result, is_dry_run, dry_run_result, duplicate, created_at, error_message")
      .in("external_reference_id", dbsExternalRefs)
      .order("created_at", { ascending: false });

    if (eventsError) {
      console.warn("[GET /api/admin/leads] DBS ingest event lookup warning:", eventsError.message);
    } else {
      for (const event of events ?? []) {
        const ref = (event as { external_reference_id?: string | null }).external_reference_id;
        if (ref && !latestIngestByRef.has(ref)) latestIngestByRef.set(ref, event as Record<string, unknown>);
      }
    }
  }

  const latestAssignmentByLeadId = new Map<string, Record<string, unknown>>();
  if (leadIds.length > 0) {
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from("lead_assignment_events")
      .select("lead_id, assignment_type, created_at, partner_account_id")
      .in("lead_id", leadIds)
      .order("created_at", { ascending: false });

    if (assignmentError) {
      console.warn("[GET /api/admin/leads] Assignment event lookup warning:", assignmentError.message);
    } else {
      for (const event of assignments ?? []) {
        const leadId = (event as { lead_id?: string | null }).lead_id;
        if (leadId && !latestAssignmentByLeadId.has(leadId)) latestAssignmentByLeadId.set(leadId, event as Record<string, unknown>);
      }
    }
  }

  let enrichedLeads = leads.map((lead) => {
    const ref = typeof lead.external_reference_id === "string" ? lead.external_reference_id : null;
    const ingest = ref ? latestIngestByRef.get(ref) : null;
    const assignment = latestAssignmentByLeadId.get(String(lead.id));
    return {
      ...lead,
      latest_ingest_result: ingest?.ingest_result ?? null,
      latest_ingest_is_dry_run: ingest?.is_dry_run ?? null,
      latest_ingest_dry_run_result: ingest?.dry_run_result ?? null,
      latest_ingest_duplicate: ingest?.duplicate ?? null,
      latest_ingest_at: ingest?.created_at ?? null,
      latest_ingest_error: ingest?.error_message ?? null,
      latest_assignment_type: assignment?.assignment_type ?? null,
      latest_assignment_event_at: assignment?.created_at ?? null,
    };
  });

  if (ingestResultFilter) {
    enrichedLeads = enrichedLeads.filter((lead) => lead.latest_ingest_result === ingestResultFilter);
  }

  return NextResponse.json({ success: true, data: enrichedLeads });
}
