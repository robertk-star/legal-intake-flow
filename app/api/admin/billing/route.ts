import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_BILLABLE_STATUSES = [
  "not_reviewed",
  "review_needed",
  "not_billable",
  "billable",
  "invoiced",
  "waived",
  "disputed",
] as const;

type BillableStatus = typeof VALID_BILLABLE_STATUSES[number];

interface BillingLeadRow {
  id: string;
  created_at: string;
  source: string | null;
  external_reference_id: string | null;
  first_name: string | null;
  last_name: string | null;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_response_updated_at: string | null;
  billable_status: BillableStatus;
  billing_amount_cents: number | null;
  billing_notes: string | null;
  billing_reviewed_at: string | null;
  billing_updated_at: string | null;
}

interface PartnerRow {
  id: string;
  firm_name: string;
  status: string;
}

interface BillingEventRow {
  id: string;
  created_at: string;
  lead_id: string;
  partner_account_id: string | null;
  event_type: string;
  previous_billable_status: string | null;
  next_billable_status: string | null;
  previous_amount_cents: number | null;
  next_amount_cents: number | null;
  notes: string | null;
  created_by: string | null;
}

function centsToDollars(cents: number | null | undefined) {
  return typeof cents === "number" ? cents / 100 : 0;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function summarize(leads: BillingLeadRow[], events: BillingEventRow[]) {
  const statusCounts: Record<string, number> = {};
  let potentialBillableCents = 0;
  let invoicedCents = 0;
  let reviewNeeded = 0;

  for (const lead of leads) {
    statusCounts[lead.billable_status] = (statusCounts[lead.billable_status] ?? 0) + 1;
    if (lead.billable_status === "review_needed") reviewNeeded += 1;
    if (lead.billable_status === "billable") potentialBillableCents += lead.billing_amount_cents ?? 0;
    if (lead.billable_status === "invoiced") invoicedCents += lead.billing_amount_cents ?? 0;
  }

  const monthStart = startOfMonth().getTime();
  const monthEvents = events.filter((event) => new Date(event.created_at).getTime() >= monthStart);

  return {
    totalTrackedLeads: leads.length,
    reviewNeeded,
    billable: statusCounts.billable ?? 0,
    invoiced: statusCounts.invoiced ?? 0,
    waived: statusCounts.waived ?? 0,
    disputed: statusCounts.disputed ?? 0,
    potentialBillableDollars: centsToDollars(potentialBillableCents),
    invoicedDollars: centsToDollars(invoicedCents),
    statusCounts,
    billingEventsThisMonth: monthEvents.length,
  };
}

/**
 * GET /api/admin/billing
 *
 * Billing readiness dashboard data. This is not payment processing and does not
 * create invoices. It helps admin review which partner-dispositioned leads may
 * be billable later.
 */
export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("billable_status")?.trim() ?? "";
  const partnerFilter = searchParams.get("partner_account_id")?.trim() ?? "";
  const responseFilter = searchParams.get("partner_response_status")?.trim() ?? "";
  const search = searchParams.get("search")?.trim() ?? "";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10) || 200, 500);

  if (statusFilter && !VALID_BILLABLE_STATUSES.includes(statusFilter as BillableStatus)) {
    return NextResponse.json(
      { error: `Invalid billable status. Allowed values: ${VALID_BILLABLE_STATUSES.join(", ")}.` },
      { status: 422 }
    );
  }

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, source, external_reference_id, first_name, last_name, state, " +
      "benefit_type, application_status, status, assigned_partner_account_id, assigned_at, " +
      "partner_response_status, partner_response_updated_at, billable_status, " +
      "billing_amount_cents, billing_notes, billing_reviewed_at, billing_updated_at"
    )
    .not("assigned_partner_account_id", "is", null)
    .order("billing_updated_at", { ascending: false, nullsFirst: false })
    .order("partner_response_updated_at", { ascending: false, nullsFirst: false })
    .order("assigned_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (statusFilter) leadsQuery = leadsQuery.eq("billable_status", statusFilter);
  if (partnerFilter) leadsQuery = leadsQuery.eq("assigned_partner_account_id", partnerFilter);
  if (responseFilter) leadsQuery = leadsQuery.eq("partner_response_status", responseFilter);
  if (search) {
    leadsQuery = leadsQuery.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,` +
      `external_reference_id.ilike.%${search}%,state.ilike.%${search}%`
    );
  }

  const [leadsResult, partnersResult, eventsResult] = await Promise.all([
    leadsQuery,
    supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, status")
      .order("firm_name", { ascending: true }),
    supabaseAdmin
      .from("lead_billing_events")
      .select(
        "id, created_at, lead_id, partner_account_id, event_type, previous_billable_status, " +
        "next_billable_status, previous_amount_cents, next_amount_cents, notes, created_by"
      )
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (leadsResult.error) {
    console.error("[GET /api/admin/billing] Leads error:", leadsResult.error);
    return NextResponse.json({ error: "Failed to load billing leads. Confirm section13 SQL has been run." }, { status: 500 });
  }

  if (partnersResult.error) {
    console.error("[GET /api/admin/billing] Partners error:", partnersResult.error);
    return NextResponse.json({ error: "Failed to load partner accounts." }, { status: 500 });
  }

  if (eventsResult.error) {
    console.error("[GET /api/admin/billing] Events error:", eventsResult.error);
    return NextResponse.json({ error: "Failed to load billing event history. Confirm section13 SQL has been run." }, { status: 500 });
  }

  const leads = (leadsResult.data ?? []) as unknown as BillingLeadRow[];
  const partners = (partnersResult.data ?? []) as unknown as PartnerRow[];
  const events = (eventsResult.data ?? []) as unknown as BillingEventRow[];
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));

  const decoratedLeads = leads.map((lead) => ({
    ...lead,
    partner_firm_name: lead.assigned_partner_account_id
      ? partnerMap.get(lead.assigned_partner_account_id)?.firm_name ?? "Unknown partner"
      : null,
  }));

  return NextResponse.json({
    success: true,
    data: {
      summary: summarize(leads, events),
      leads: decoratedLeads,
      partners,
      recentEvents: events,
      allowedStatuses: VALID_BILLABLE_STATUSES,
    },
  });
}
