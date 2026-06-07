import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const VALID_STATUSES = [
  "not_reviewed",
  "review_needed",
  "not_billable",
  "billable",
  "invoiced",
  "waived",
  "disputed",
] as const;

type BillableStatus = typeof VALID_STATUSES[number];

interface ExportLeadRow {
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
  billable_status: BillableStatus | null;
  billing_amount_cents: number | null;
  billing_notes: string | null;
  billing_reviewed_at: string | null;
  billing_updated_at: string | null;
}

interface PartnerRow {
  id: string;
  firm_name: string;
}

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function today(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function toStartOfDayIso(value: string | null) {
  return `${value || monthStart()}T00:00:00.000Z`;
}

function toEndOfDayIso(value: string | null) {
  return `${value || today()}T23:59:59.999Z`;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  if (/[,"\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function leadName(lead: ExportLeadRow) {
  return `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim() || "Unnamed Lead";
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
    (status) => !VALID_STATUSES.includes(status as BillableStatus)
  );
  if (invalidStatus) {
    return NextResponse.json({ error: `Invalid billing status '${invalidStatus}'.` }, { status: 422 });
  }

  let leadsQuery = supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, external_reference_id, first_name, last_name, state, benefit_type, " +
      "application_status, assigned_partner_account_id, assigned_at, partner_response_status, " +
      "billable_status, billing_amount_cents, billing_notes, billing_reviewed_at, billing_updated_at"
    )
    .not("assigned_partner_account_id", "is", null)
    .gte("assigned_at", toStartOfDayIso(from))
    .lte("assigned_at", toEndOfDayIso(to))
    .order("assigned_at", { ascending: true });

  if (partnerId) leadsQuery = leadsQuery.eq("assigned_partner_account_id", partnerId);
  if (includeStatuses.length > 0) leadsQuery = leadsQuery.in("billable_status", includeStatuses);

  const [leadsResult, partnersResult] = await Promise.all([
    leadsQuery,
    supabaseAdmin.from("partner_accounts").select("id, firm_name"),
  ]);

  if (leadsResult.error) {
    console.error("[GET /api/admin/billing/statements/export] Leads error:", leadsResult.error);
    return NextResponse.json({ error: "Failed to export billing statement leads." }, { status: 500 });
  }

  if (partnersResult.error) {
    console.error("[GET /api/admin/billing/statements/export] Partners error:", partnersResult.error);
    return NextResponse.json({ error: "Failed to load partner accounts." }, { status: 500 });
  }

  const leads = (leadsResult.data ?? []) as unknown as ExportLeadRow[];
  const partners = (partnersResult.data ?? []) as unknown as PartnerRow[];
  const partnerMap = new Map(partners.map((partner) => [partner.id, partner.firm_name]));

  const rows = [
    [
      "Period From",
      "Period To",
      "Partner",
      "Lead ID",
      "External Reference",
      "Claimant Name",
      "State",
      "Benefit Type",
      "Application Status",
      "Assigned At",
      "Partner Response",
      "Billing Status",
      "Billing Amount",
      "Billing Reviewed At",
      "Billing Updated At",
      "Billing Notes",
    ],
    ...leads.map((lead) => [
      from,
      to,
      partnerMap.get(lead.assigned_partner_account_id ?? "") ?? "Unknown partner",
      lead.id,
      lead.external_reference_id ?? "",
      leadName(lead),
      lead.state ?? "",
      lead.benefit_type ?? "",
      lead.application_status ?? "",
      lead.assigned_at ?? "",
      lead.partner_response_status ?? "",
      lead.billable_status ?? "not_reviewed",
      ((lead.billing_amount_cents ?? 0) / 100).toFixed(2),
      lead.billing_reviewed_at ?? "",
      lead.billing_updated_at ?? "",
      lead.billing_notes ?? "",
    ]),
  ];

  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  const filename = `lif-billing-statements-${from}-to-${to}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
