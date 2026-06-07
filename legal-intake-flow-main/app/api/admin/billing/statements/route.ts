import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const STATEMENT_BILLABLE_STATUSES = [
  "not_reviewed",
  "review_needed",
  "not_billable",
  "billable",
  "invoiced",
  "waived",
  "disputed",
] as const;

type BillableStatus = typeof STATEMENT_BILLABLE_STATUSES[number];

interface StatementLeadRow {
  id: string;
  created_at: string;
  external_reference_id: string | null;
  first_name: string | null;
  last_name: string | null;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_response_updated_at: string | null;
  billable_status: BillableStatus | null;
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

interface StatementLead extends StatementLeadRow {
  claimant_name: string;
  billing_amount_dollars: number;
}

interface PartnerStatement {
  partner_account_id: string;
  firm_name: string;
  partner_status: string;
  total_assigned: number;
  billable_count: number;
  billable_amount_cents: number;
  invoiced_count: number;
  invoiced_amount_cents: number;
  review_needed_count: number;
  not_reviewed_count: number;
  not_billable_count: number;
  waived_count: number;
  disputed_count: number;
  retained_count: number;
  declined_count: number;
  leads: StatementLead[];
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function today(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toStartOfDayIso(value: string | null) {
  if (!value) return `${monthStart()}T00:00:00.000Z`;
  return `${value}T00:00:00.000Z`;
}

function toEndOfDayIso(value: string | null) {
  if (!value) return `${today()}T23:59:59.999Z`;
  return `${value}T23:59:59.999Z`;
}

function leadName(lead: StatementLeadRow) {
  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
  return name || "Unnamed Lead";
}

function amountForStatement(lead: StatementLeadRow) {
  return typeof lead.billing_amount_cents === "number" ? lead.billing_amount_cents : 0;
}

function buildStatements(leads: StatementLeadRow[], partners: PartnerRow[]) {
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));
  const statementMap = new Map<string, PartnerStatement>();

  for (const lead of leads) {
    if (!lead.assigned_partner_account_id) continue;
    const partner = partnerMap.get(lead.assigned_partner_account_id);
    const partnerId = lead.assigned_partner_account_id;

    if (!statementMap.has(partnerId)) {
      statementMap.set(partnerId, {
        partner_account_id: partnerId,
        firm_name: partner?.firm_name ?? "Unknown partner",
        partner_status: partner?.status ?? "unknown",
        total_assigned: 0,
        billable_count: 0,
        billable_amount_cents: 0,
        invoiced_count: 0,
        invoiced_amount_cents: 0,
        review_needed_count: 0,
        not_reviewed_count: 0,
        not_billable_count: 0,
        waived_count: 0,
        disputed_count: 0,
        retained_count: 0,
        declined_count: 0,
        leads: [],
      });
    }

    const statement = statementMap.get(partnerId)!;
    const billableStatus = lead.billable_status ?? "not_reviewed";
    const amount = amountForStatement(lead);
    statement.total_assigned += 1;

    if (billableStatus === "billable") {
      statement.billable_count += 1;
      statement.billable_amount_cents += amount;
    } else if (billableStatus === "invoiced") {
      statement.invoiced_count += 1;
      statement.invoiced_amount_cents += amount;
    } else if (billableStatus === "review_needed") {
      statement.review_needed_count += 1;
    } else if (billableStatus === "not_reviewed") {
      statement.not_reviewed_count += 1;
    } else if (billableStatus === "not_billable") {
      statement.not_billable_count += 1;
    } else if (billableStatus === "waived") {
      statement.waived_count += 1;
    } else if (billableStatus === "disputed") {
      statement.disputed_count += 1;
    }

    if (lead.partner_response_status === "retained") statement.retained_count += 1;
    if (lead.partner_response_status === "declined") statement.declined_count += 1;

    statement.leads.push({
      ...lead,
      claimant_name: leadName(lead),
      billable_status: billableStatus,
      billing_amount_dollars: amount / 100,
    });
  }

  return [...statementMap.values()].sort((a, b) =>
    a.firm_name.localeCompare(b.firm_name)
  );
}

function summarize(statements: PartnerStatement[]) {
  return statements.reduce(
    (summary, statement) => {
      summary.partner_count += 1;
      summary.total_assigned += statement.total_assigned;
      summary.billable_count += statement.billable_count;
      summary.billable_amount_cents += statement.billable_amount_cents;
      summary.invoiced_count += statement.invoiced_count;
      summary.invoiced_amount_cents += statement.invoiced_amount_cents;
      summary.review_needed_count += statement.review_needed_count;
      summary.not_reviewed_count += statement.not_reviewed_count;
      summary.disputed_count += statement.disputed_count;
      summary.retained_count += statement.retained_count;
      return summary;
    },
    {
      partner_count: 0,
      total_assigned: 0,
      billable_count: 0,
      billable_amount_cents: 0,
      invoiced_count: 0,
      invoiced_amount_cents: 0,
      review_needed_count: 0,
      not_reviewed_count: 0,
      disputed_count: 0,
      retained_count: 0,
    }
  );
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || monthStart();
  const to = searchParams.get("to") || today();
  const partnerId = searchParams.get("partner_id")?.trim() || "";
  const includeStatuses = (searchParams.get("billing_statuses") || "billable,invoiced")
    .split(",")
    .map((status) => status.trim())
    .filter(Boolean);

  const invalidStatus = includeStatuses.find(
    (status) => !STATEMENT_BILLABLE_STATUSES.includes(status as BillableStatus)
  );
  if (invalidStatus) {
    return NextResponse.json(
      { error: `Invalid billing status '${invalidStatus}'. Allowed values: ${STATEMENT_BILLABLE_STATUSES.join(", ")}.` },
      { status: 422 }
    );
  }

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, external_reference_id, first_name, last_name, state, benefit_type, " +
      "application_status, assigned_partner_account_id, assigned_at, partner_response_status, " +
      "partner_response_updated_at, billable_status, billing_amount_cents, billing_notes, " +
      "billing_reviewed_at, billing_updated_at"
    )
    .not("assigned_partner_account_id", "is", null)
    .gte("assigned_at", toStartOfDayIso(from))
    .lte("assigned_at", toEndOfDayIso(to))
    .order("assigned_at", { ascending: true });

  if (partnerId) leadsQuery = leadsQuery.eq("assigned_partner_account_id", partnerId);
  if (includeStatuses.length > 0) leadsQuery = leadsQuery.in("billable_status", includeStatuses);

  const [leadsResult, partnersResult] = await Promise.all([
    leadsQuery,
    supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, status")
      .order("firm_name", { ascending: true }),
  ]);

  if (leadsResult.error) {
    console.error("[GET /api/admin/billing/statements] Leads error:", leadsResult.error);
    return NextResponse.json(
      { error: "Failed to load billing statement leads. Confirm section13 SQL has been run." },
      { status: 500 }
    );
  }

  if (partnersResult.error) {
    console.error("[GET /api/admin/billing/statements] Partners error:", partnersResult.error);
    return NextResponse.json({ error: "Failed to load partner accounts." }, { status: 500 });
  }

  const leads = (leadsResult.data ?? []) as unknown as StatementLeadRow[];
  const partners = (partnersResult.data ?? []) as unknown as PartnerRow[];
  const statements = buildStatements(leads, partners);

  return NextResponse.json({
    success: true,
    data: {
      period: { from, to },
      filters: {
        partner_id: partnerId || null,
        billing_statuses: includeStatuses,
      },
      summary: summarize(statements),
      partners,
      statements,
    },
  });
}
