import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type Column = {
  key: string;
  label: string;
  format?: "money" | "date" | "datetime" | "array" | "json";
};

type DatasetConfig = {
  table: string;
  filenamePrefix: string;
  dateColumn: string;
  select: string;
  columns: Column[];
  partnerColumn?: string;
  statusColumn?: string;
  orderColumn?: string;
};

const DATASETS: Record<string, DatasetConfig> = {
  leads: {
    table: "leads",
    filenamePrefix: "lif-leads",
    dateColumn: "created_at",
    partnerColumn: "assigned_partner_account_id",
    statusColumn: "status",
    orderColumn: "created_at",
    select: [
      "id", "created_at", "updated_at", "source", "external_reference_id",
      "first_name", "last_name", "phone", "email", "city", "state", "zip",
      "benefit_type", "application_status", "status", "assigned_partner_account_id",
      "assigned_at", "partner_response_status", "partner_response_updated_at", "partner_viewed_at",
      "billable_status", "billing_amount_cents", "billing_reviewed_at", "billing_updated_at",
    ].join(", "),
    columns: [
      { key: "id", label: "Lead ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "source", label: "Source" },
      { key: "external_reference_id", label: "External Reference" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "state", label: "State" },
      { key: "zip", label: "ZIP" },
      { key: "benefit_type", label: "Benefit Type" },
      { key: "application_status", label: "Application Status" },
      { key: "status", label: "Lead Status" },
      { key: "assigned_partner_account_id", label: "Assigned Partner ID" },
      { key: "assigned_at", label: "Assigned At", format: "datetime" },
      { key: "partner_response_status", label: "Partner Response" },
      { key: "partner_response_updated_at", label: "Partner Response Updated", format: "datetime" },
      { key: "partner_viewed_at", label: "Partner Viewed", format: "datetime" },
      { key: "billable_status", label: "Billing Status" },
      { key: "billing_amount_cents", label: "Billing Amount", format: "money" },
      { key: "billing_reviewed_at", label: "Billing Reviewed", format: "datetime" },
      { key: "billing_updated_at", label: "Billing Updated", format: "datetime" },
    ],
  },
  partners: {
    table: "partner_accounts",
    filenamePrefix: "lif-partner-accounts",
    dateColumn: "created_at",
    statusColumn: "status",
    orderColumn: "created_at",
    select: [
      "id", "created_at", "updated_at", "firm_name", "contact_first_name", "contact_last_name",
      "email", "phone", "website", "states_served", "practice_area", "monthly_lead_capacity",
      "status", "last_login_at", "accepting_leads", "lead_status", "accepted_case_types",
      "accepted_languages", "routing_states", "billing_contact_name", "billing_contact_email",
      "billing_contact_phone", "billing_city", "billing_state", "billing_zip",
    ].join(", "),
    columns: [
      { key: "id", label: "Partner ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "firm_name", label: "Firm Name" },
      { key: "contact_first_name", label: "Contact First Name" },
      { key: "contact_last_name", label: "Contact Last Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "website", label: "Website" },
      { key: "states_served", label: "States Served" },
      { key: "routing_states", label: "Routing States", format: "array" },
      { key: "practice_area", label: "Practice Area" },
      { key: "monthly_lead_capacity", label: "Monthly Lead Capacity" },
      { key: "status", label: "Account Status" },
      { key: "accepting_leads", label: "Accepting Leads" },
      { key: "lead_status", label: "Lead Status" },
      { key: "accepted_case_types", label: "Accepted Case Types", format: "array" },
      { key: "accepted_languages", label: "Languages", format: "array" },
      { key: "last_login_at", label: "Last Login", format: "datetime" },
      { key: "billing_contact_name", label: "Billing Contact Name" },
      { key: "billing_contact_email", label: "Billing Contact Email" },
      { key: "billing_contact_phone", label: "Billing Contact Phone" },
      { key: "billing_city", label: "Billing City" },
      { key: "billing_state", label: "Billing State" },
      { key: "billing_zip", label: "Billing ZIP" },
    ],
  },
  partner_users: {
    table: "partner_users",
    filenamePrefix: "lif-partner-users",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    statusColumn: "status",
    orderColumn: "created_at",
    select: "id, created_at, updated_at, partner_account_id, email, first_name, last_name, role, status, last_login_at, invited_at, accepted_at, invite_email_sent_at, invite_email_count",
    columns: [
      { key: "id", label: "User ID" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "email", label: "Email" },
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "role", label: "Role" },
      { key: "status", label: "Status" },
      { key: "last_login_at", label: "Last Login", format: "datetime" },
      { key: "invited_at", label: "Invited", format: "datetime" },
      { key: "accepted_at", label: "Accepted", format: "datetime" },
      { key: "invite_email_sent_at", label: "Invite Email Sent", format: "datetime" },
      { key: "invite_email_count", label: "Invite Count" },
    ],
  },
  invoices: {
    table: "partner_billing_invoices",
    filenamePrefix: "lif-invoices",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    statusColumn: "status",
    orderColumn: "created_at",
    select: "id, created_at, updated_at, partner_account_id, invoice_number, status, period_start, period_end, due_date, subtotal_cents, total_cents, amount_paid_cents, balance_due_cents, sent_at, paid_at, voided_at, invoice_email_sent_at, invoice_email_count, reminder_sent_at, reminder_count, overdue_marked_at, notes",
    columns: [
      { key: "id", label: "Invoice ID" },
      { key: "invoice_number", label: "Invoice Number" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "status", label: "Status" },
      { key: "period_start", label: "Period Start", format: "date" },
      { key: "period_end", label: "Period End", format: "date" },
      { key: "due_date", label: "Due Date", format: "date" },
      { key: "subtotal_cents", label: "Subtotal", format: "money" },
      { key: "total_cents", label: "Total", format: "money" },
      { key: "amount_paid_cents", label: "Amount Paid", format: "money" },
      { key: "balance_due_cents", label: "Balance Due", format: "money" },
      { key: "sent_at", label: "Sent", format: "datetime" },
      { key: "paid_at", label: "Paid", format: "datetime" },
      { key: "invoice_email_sent_at", label: "Invoice Email Sent", format: "datetime" },
      { key: "invoice_email_count", label: "Invoice Email Count" },
      { key: "reminder_sent_at", label: "Reminder Sent", format: "datetime" },
      { key: "reminder_count", label: "Reminder Count" },
      { key: "overdue_marked_at", label: "Overdue Marked", format: "datetime" },
      { key: "notes", label: "Notes" },
    ],
  },
  invoice_items: {
    table: "partner_billing_invoice_items",
    filenamePrefix: "lif-invoice-items",
    dateColumn: "created_at",
    orderColumn: "created_at",
    select: "id, created_at, invoice_id, lead_id, description, amount_cents, billing_status_at_creation",
    columns: [
      { key: "id", label: "Item ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "invoice_id", label: "Invoice ID" },
      { key: "lead_id", label: "Lead ID" },
      { key: "description", label: "Description" },
      { key: "amount_cents", label: "Amount", format: "money" },
      { key: "billing_status_at_creation", label: "Billing Status At Creation" },
    ],
  },
  billing_events: {
    table: "lead_billing_events",
    filenamePrefix: "lif-lead-billing-events",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    orderColumn: "created_at",
    select: "id, created_at, lead_id, partner_account_id, event_type, previous_billable_status, next_billable_status, previous_amount_cents, next_amount_cents, notes, created_by",
    columns: [
      { key: "id", label: "Event ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "lead_id", label: "Lead ID" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "event_type", label: "Event Type" },
      { key: "previous_billable_status", label: "Previous Status" },
      { key: "next_billable_status", label: "Next Status" },
      { key: "previous_amount_cents", label: "Previous Amount", format: "money" },
      { key: "next_amount_cents", label: "Next Amount", format: "money" },
      { key: "notes", label: "Notes" },
      { key: "created_by", label: "Created By" },
    ],
  },
  invoice_events: {
    table: "partner_billing_invoice_events",
    filenamePrefix: "lif-invoice-events",
    dateColumn: "created_at",
    orderColumn: "created_at",
    select: "id, created_at, invoice_id, event_type, previous_status, next_status, amount_cents, notes, created_by",
    columns: [
      { key: "id", label: "Event ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "invoice_id", label: "Invoice ID" },
      { key: "event_type", label: "Event Type" },
      { key: "previous_status", label: "Previous Status" },
      { key: "next_status", label: "Next Status" },
      { key: "amount_cents", label: "Amount", format: "money" },
      { key: "notes", label: "Notes" },
      { key: "created_by", label: "Created By" },
    ],
  },
  disputes: {
    table: "partner_billing_disputes",
    filenamePrefix: "lif-invoice-disputes",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    statusColumn: "status",
    orderColumn: "created_at",
    select: "id, created_at, updated_at, partner_account_id, partner_user_id, invoice_id, invoice_item_id, lead_id, reason, details, status, admin_resolution_notes, resolved_at, resolved_by",
    columns: [
      { key: "id", label: "Dispute ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "partner_user_id", label: "Partner User ID" },
      { key: "invoice_id", label: "Invoice ID" },
      { key: "lead_id", label: "Lead ID" },
      { key: "reason", label: "Reason" },
      { key: "details", label: "Details" },
      { key: "status", label: "Status" },
      { key: "admin_resolution_notes", label: "Admin Resolution Notes" },
      { key: "resolved_at", label: "Resolved", format: "datetime" },
      { key: "resolved_by", label: "Resolved By" },
    ],
  },
  notifications: {
    table: "email_notifications",
    filenamePrefix: "lif-email-notifications",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    statusColumn: "status",
    orderColumn: "created_at",
    select: "id, created_at, notification_type, recipient_email, recipient_name, subject, status, error_message, sent_at, lead_id, partner_account_id, partner_user_id, invoice_id",
    columns: [
      { key: "id", label: "Notification ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "notification_type", label: "Type" },
      { key: "recipient_email", label: "Recipient Email" },
      { key: "recipient_name", label: "Recipient Name" },
      { key: "subject", label: "Subject" },
      { key: "status", label: "Status" },
      { key: "error_message", label: "Error Message" },
      { key: "sent_at", label: "Sent", format: "datetime" },
      { key: "lead_id", label: "Lead ID" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "partner_user_id", label: "Partner User ID" },
      { key: "invoice_id", label: "Invoice ID" },
    ],
  },
  profile_events: {
    table: "partner_account_profile_events",
    filenamePrefix: "lif-partner-profile-events",
    dateColumn: "created_at",
    partnerColumn: "partner_account_id",
    orderColumn: "created_at",
    select: "id, created_at, partner_account_id, partner_user_id, event_type, changed_fields, previous_values, new_values, note",
    columns: [
      { key: "id", label: "Event ID" },
      { key: "created_at", label: "Created", format: "datetime" },
      { key: "partner_account_id", label: "Partner ID" },
      { key: "partner_user_id", label: "Partner User ID" },
      { key: "event_type", label: "Event Type" },
      { key: "changed_fields", label: "Changed Fields", format: "array" },
      { key: "previous_values", label: "Previous Values", format: "json" },
      { key: "new_values", label: "New Values", format: "json" },
      { key: "note", label: "Note" },
    ],
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown, format?: Column["format"]) {
  if (value === null || value === undefined) return "";
  if (format === "money") {
    if (typeof value !== "number") return "";
    return (value / 100).toFixed(2);
  }
  if (format === "date" || format === "datetime") {
    return String(value);
  }
  if (format === "array") {
    return Array.isArray(value) ? value.join("; ") : String(value ?? "");
  }
  if (format === "json") {
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function escapeCsv(value: string) {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safe.replace(/"/g, '""')}"`;
}

function rowsToCsv(rows: Record<string, unknown>[], columns: Column[]) {
  const header = columns.map((column) => escapeCsv(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => escapeCsv(formatValue(row[column.key], column.format))).join(",")
  );
  return [header, ...body].join("\n");
}

function yyyymmdd(value = new Date()) {
  return value.toISOString().slice(0, 10).replace(/-/g, "");
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const datasetId = searchParams.get("dataset") ?? "";
  const config = DATASETS[datasetId];

  if (!config) {
    return NextResponse.json({ error: "Invalid export dataset." }, { status: 422 });
  }

  const startDate = searchParams.get("start_date")?.trim() ?? "";
  const endDate = searchParams.get("end_date")?.trim() ?? "";
  const partnerId = searchParams.get("partner_account_id")?.trim() ?? "";
  const status = searchParams.get("status")?.trim() ?? "";
  const rawLimit = Number.parseInt(searchParams.get("limit") ?? "1000", 10);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 1000, 1), 10000);

  let query = supabaseAdmin
    .from(config.table)
    .select(config.select)
    .order(config.orderColumn ?? config.dateColumn, { ascending: false })
    .limit(limit);

  if (startDate) {
    query = query.gte(config.dateColumn, startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`);
  }
  if (endDate) {
    query = query.lte(config.dateColumn, endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`);
  }
  if (partnerId && config.partnerColumn) {
    query = query.eq(config.partnerColumn, partnerId);
  }
  if (status && config.statusColumn) {
    query = query.eq(config.statusColumn, status);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`[GET /api/admin/exports/download] ${datasetId} export error:`, error);
    return NextResponse.json({ error: "Failed to generate export." }, { status: 500 });
  }

  const rows = ((data ?? []) as unknown[]).filter(isPlainObject);
  const csv = rowsToCsv(rows, config.columns);
  const filename = `${config.filenamePrefix}-${yyyymmdd()}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
