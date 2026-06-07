import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type ActivitySeverity = "info" | "success" | "warning" | "danger";

type ActivityItem = {
  id: string;
  occurredAt: string;
  category: string;
  eventType: string;
  severity: ActivitySeverity;
  title: string;
  description: string;
  partnerAccountId?: string | null;
  partnerUserId?: string | null;
  leadId?: string | null;
  invoiceId?: string | null;
  notificationId?: string | null;
  disputeId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type PartnerLookup = Record<string, string>;
type LeadLookup = Record<string, string>;
type InvoiceLookup = Record<string, string>;

type OptionalRows<T> = {
  rows: T[];
  warning: string | null;
};

type AssignmentRow = {
  id: string;
  created_at: string;
  lead_id: string | null;
  partner_account_id: string | null;
  previous_partner_account_id: string | null;
  assignment_type: string | null;
  score: number | null;
  matched_rules: string[] | null;
  blockers: string[] | null;
  warnings: string[] | null;
  notes: string | null;
};

type EmailRow = {
  id: string;
  created_at: string;
  notification_type: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  subject: string | null;
  status: string | null;
  error_message: string | null;
  sent_at: string | null;
  lead_id: string | null;
  partner_account_id: string | null;
  partner_user_id: string | null;
  invoice_id: string | null;
};

type LeadBillingRow = {
  id: string;
  created_at: string;
  lead_id: string | null;
  partner_account_id: string | null;
  event_type: string | null;
  previous_billable_status: string | null;
  next_billable_status: string | null;
  previous_amount_cents: number | null;
  next_amount_cents: number | null;
  notes: string | null;
};

type InvoiceEventRow = {
  id: string;
  created_at: string;
  invoice_id: string | null;
  event_type: string | null;
  previous_status: string | null;
  next_status: string | null;
  amount_cents: number | null;
  notes: string | null;
};

type DisputeRow = {
  id: string;
  created_at: string;
  updated_at: string | null;
  partner_account_id: string | null;
  partner_user_id: string | null;
  invoice_id: string | null;
  lead_id: string | null;
  reason: string | null;
  status: string | null;
  admin_resolution_notes: string | null;
  resolved_at: string | null;
};

type ProfileEventRow = {
  id: string;
  created_at: string;
  partner_account_id: string | null;
  partner_user_id: string | null;
  event_type: string | null;
  changed_fields: string[] | null;
  previous_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  note: string | null;
};

type LeadRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  external_reference_id: string | null;
};

type PartnerRow = { id: string; firm_name: string | null; email: string | null };
type InvoiceRow = { id: string; invoice_number: string | null; partner_account_id: string | null };

const CATEGORY_OPTIONS = [
  "assignment",
  "email",
  "billing",
  "invoice",
  "dispute",
  "profile",
] as const;

function formatMoney(cents: number | null | undefined) {
  if (typeof cents !== "number") return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function labelize(value: string | null | undefined, fallback = "Update") {
  if (!value) return fallback;
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function leadLabel(id: string | null | undefined, leads: LeadLookup) {
  if (!id) return "lead";
  return leads[id] ?? `lead ${id.slice(0, 8)}`;
}

function partnerLabel(id: string | null | undefined, partners: PartnerLookup) {
  if (!id) return "unassigned partner";
  return partners[id] ?? `partner ${id.slice(0, 8)}`;
}

function invoiceLabel(id: string | null | undefined, invoices: InvoiceLookup) {
  if (!id) return "invoice";
  return invoices[id] ?? `invoice ${id.slice(0, 8)}`;
}

function severityForEmail(status: string | null): ActivitySeverity {
  if (status === "sent") return "success";
  if (status === "failed") return "danger";
  if (status === "skipped") return "warning";
  return "info";
}

function severityForDispute(status: string | null): ActivitySeverity {
  if (status === "open" || status === "in_review") return "warning";
  if (status === "declined") return "danger";
  if (status === "resolved") return "success";
  return "info";
}

function severityForInvoiceEvent(eventType: string | null, nextStatus: string | null): ActivitySeverity {
  if (eventType === "voided" || nextStatus === "void") return "danger";
  if (nextStatus === "paid") return "success";
  if (nextStatus === "partially_paid") return "warning";
  return "info";
}

async function fetchOptional<T>(
  table: string,
  select: string,
  startDate: string | null,
  endDate: string | null,
  limit: number
): Promise<OptionalRows<T>> {
  let query = supabaseAdmin
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (startDate) query = query.gte("created_at", startDate);
  if (endDate) query = query.lte("created_at", endDate);

  const { data, error } = await query;
  if (error) {
    return {
      rows: [],
      warning: `${table}: ${error.message}`,
    };
  }

  return { rows: (data ?? []) as unknown as T[], warning: null };
}

async function buildLookups(items: ActivityItem[]) {
  const leadIds = Array.from(new Set(items.map((item) => item.leadId).filter(Boolean))) as string[];
  const partnerIds = Array.from(new Set(items.map((item) => item.partnerAccountId).filter(Boolean))) as string[];
  const invoiceIds = Array.from(new Set(items.map((item) => item.invoiceId).filter(Boolean))) as string[];

  const leads: LeadLookup = {};
  const partners: PartnerLookup = {};
  const invoices: InvoiceLookup = {};

  if (leadIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("leads")
      .select("id, first_name, last_name, external_reference_id, created_at")
      .in("id", leadIds);
    for (const row of ((data ?? []) as unknown as LeadRow[])) {
      const name = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
      leads[row.id] = name || row.external_reference_id || `lead ${row.id.slice(0, 8)}`;
    }
  }

  if (partnerIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("partner_accounts")
      .select("id, firm_name, email")
      .in("id", partnerIds);
    for (const row of ((data ?? []) as unknown as PartnerRow[])) {
      partners[row.id] = row.firm_name || row.email || `partner ${row.id.slice(0, 8)}`;
    }
  }

  if (invoiceIds.length > 0) {
    const { data } = await supabaseAdmin
      .from("partner_billing_invoices")
      .select("id, invoice_number, partner_account_id")
      .in("id", invoiceIds);
    for (const row of ((data ?? []) as unknown as InvoiceRow[])) {
      invoices[row.id] = row.invoice_number || `invoice ${row.id.slice(0, 8)}`;
    }
  }

  return { leads, partners, invoices };
}

function enrichItems(items: ActivityItem[], lookups: { leads: LeadLookup; partners: PartnerLookup; invoices: InvoiceLookup }) {
  return items.map((item) => {
    let description = item.description;
    description = description.replace(/\{lead\}/g, leadLabel(item.leadId, lookups.leads));
    description = description.replace(/\{partner\}/g, partnerLabel(item.partnerAccountId, lookups.partners));
    description = description.replace(/\{invoice\}/g, invoiceLabel(item.invoiceId, lookups.invoices));
    return { ...item, description };
  });
}

export async function GET(request: Request) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim() ?? "all";
  const search = searchParams.get("search")?.trim().toLowerCase() ?? "";
  const startDate = searchParams.get("start_date") || null;
  const endDate = searchParams.get("end_date") || null;
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "150", 10) || 150, 300);

  const allowedCategory = category === "all" || CATEGORY_OPTIONS.includes(category as typeof CATEGORY_OPTIONS[number]);
  if (!allowedCategory) {
    return NextResponse.json(
      { error: `Invalid category. Allowed values: all, ${CATEGORY_OPTIONS.join(", ")}.` },
      { status: 422 }
    );
  }

  const warnings: string[] = [];
  const items: ActivityItem[] = [];

  const shouldFetch = (name: string) => category === "all" || category === name;

  if (shouldFetch("assignment")) {
    const result = await fetchOptional<AssignmentRow>(
      "lead_assignment_events",
      "id, created_at, lead_id, partner_account_id, previous_partner_account_id, assignment_type, score, matched_rules, blockers, warnings, notes",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      const eventType = row.assignment_type ?? "manual";
      items.push({
        id: `assignment:${row.id}`,
        occurredAt: row.created_at,
        category: "assignment",
        eventType,
        severity: eventType === "best_match" ? "success" : "info",
        title: `${labelize(eventType)} assignment`,
        description: `{lead} assigned to {partner}${typeof row.score === "number" ? ` with score ${row.score}` : ""}.`,
        leadId: row.lead_id,
        partnerAccountId: row.partner_account_id,
        metadata: {
          previousPartnerAccountId: row.previous_partner_account_id,
          score: row.score,
          matchedRules: row.matched_rules,
          blockers: row.blockers,
          warnings: row.warnings,
          notes: row.notes,
        },
      });
    }
  }

  if (shouldFetch("email")) {
    const result = await fetchOptional<EmailRow>(
      "email_notifications",
      "id, created_at, notification_type, recipient_email, recipient_name, subject, status, error_message, sent_at, lead_id, partner_account_id, partner_user_id, invoice_id",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      items.push({
        id: `email:${row.id}`,
        occurredAt: row.created_at,
        category: "email",
        eventType: row.notification_type ?? "email",
        severity: severityForEmail(row.status),
        title: `${labelize(row.notification_type, "Email")} ${labelize(row.status, "queued").toLowerCase()}`,
        description: `${row.subject ?? "Email"} to ${row.recipient_email ?? "recipient"}${row.error_message ? ` — ${row.error_message}` : ""}.`,
        leadId: row.lead_id,
        partnerAccountId: row.partner_account_id,
        partnerUserId: row.partner_user_id,
        invoiceId: row.invoice_id,
        notificationId: row.id,
        metadata: {
          recipientName: row.recipient_name,
          recipientEmail: row.recipient_email,
          status: row.status,
          sentAt: row.sent_at,
          errorMessage: row.error_message,
        },
      });
    }
  }

  if (shouldFetch("billing")) {
    const result = await fetchOptional<LeadBillingRow>(
      "lead_billing_events",
      "id, created_at, lead_id, partner_account_id, event_type, previous_billable_status, next_billable_status, previous_amount_cents, next_amount_cents, notes",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      items.push({
        id: `billing:${row.id}`,
        occurredAt: row.created_at,
        category: "billing",
        eventType: row.event_type ?? "billing_review",
        severity: row.next_billable_status === "disputed" ? "warning" : "info",
        title: `${labelize(row.event_type, "Billing review")}`,
        description: `{lead} billing changed from ${labelize(row.previous_billable_status, "not reviewed")} to ${labelize(row.next_billable_status, "not reviewed")}. Amount: ${formatMoney(row.next_amount_cents)}.`,
        leadId: row.lead_id,
        partnerAccountId: row.partner_account_id,
        metadata: {
          previousStatus: row.previous_billable_status,
          nextStatus: row.next_billable_status,
          previousAmountCents: row.previous_amount_cents,
          nextAmountCents: row.next_amount_cents,
          notes: row.notes,
        },
      });
    }
  }

  if (shouldFetch("invoice")) {
    const result = await fetchOptional<InvoiceEventRow>(
      "partner_billing_invoice_events",
      "id, created_at, invoice_id, event_type, previous_status, next_status, amount_cents, notes",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      items.push({
        id: `invoice:${row.id}`,
        occurredAt: row.created_at,
        category: "invoice",
        eventType: row.event_type ?? "invoice_event",
        severity: severityForInvoiceEvent(row.event_type, row.next_status),
        title: `${labelize(row.event_type, "Invoice event")}`,
        description: `{invoice} event${row.next_status ? ` — ${labelize(row.previous_status, "none")} → ${labelize(row.next_status)}` : ""}${typeof row.amount_cents === "number" ? ` (${formatMoney(row.amount_cents)})` : ""}.`,
        invoiceId: row.invoice_id,
        metadata: {
          previousStatus: row.previous_status,
          nextStatus: row.next_status,
          amountCents: row.amount_cents,
          notes: row.notes,
        },
      });
    }
  }

  if (shouldFetch("dispute")) {
    const result = await fetchOptional<DisputeRow>(
      "partner_billing_disputes",
      "id, created_at, updated_at, partner_account_id, partner_user_id, invoice_id, lead_id, reason, status, admin_resolution_notes, resolved_at",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      items.push({
        id: `dispute:${row.id}`,
        occurredAt: row.created_at,
        category: "dispute",
        eventType: row.status ?? "open",
        severity: severityForDispute(row.status),
        title: `Invoice dispute ${labelize(row.status, "opened").toLowerCase()}`,
        description: `{partner} submitted a ${labelize(row.reason, "billing question").toLowerCase()} for {invoice}.`,
        partnerAccountId: row.partner_account_id,
        partnerUserId: row.partner_user_id,
        invoiceId: row.invoice_id,
        leadId: row.lead_id,
        disputeId: row.id,
        metadata: {
          reason: row.reason,
          status: row.status,
          resolvedAt: row.resolved_at,
          adminResolutionNotes: row.admin_resolution_notes,
          updatedAt: row.updated_at,
        },
      });
    }
  }

  if (shouldFetch("profile")) {
    const result = await fetchOptional<ProfileEventRow>(
      "partner_account_profile_events",
      "id, created_at, partner_account_id, partner_user_id, event_type, changed_fields, previous_values, new_values, note",
      startDate,
      endDate,
      limit
    );
    if (result.warning) warnings.push(result.warning);
    for (const row of result.rows) {
      const changed = row.changed_fields?.length ? row.changed_fields.join(", ") : "profile fields";
      items.push({
        id: `profile:${row.id}`,
        occurredAt: row.created_at,
        category: "profile",
        eventType: row.event_type ?? "profile_updated",
        severity: "info",
        title: `${labelize(row.event_type, "Profile updated")}`,
        description: `{partner} updated ${changed}.`,
        partnerAccountId: row.partner_account_id,
        partnerUserId: row.partner_user_id,
        metadata: {
          changedFields: row.changed_fields,
          previousValues: row.previous_values,
          newValues: row.new_values,
          note: row.note,
        },
      });
    }
  }

  const lookups = await buildLookups(items);
  let enriched = enrichItems(items, lookups);

  if (search) {
    enriched = enriched.filter((item) => {
      const haystack = [
        item.title,
        item.description,
        item.category,
        item.eventType,
        item.leadId,
        item.partnerAccountId,
        item.invoiceId,
        item.notificationId,
        item.disputeId,
        JSON.stringify(item.metadata ?? {}),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }

  enriched.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
  const limited = enriched.slice(0, limit);

  const summary = limited.reduce(
    (acc, item) => {
      acc.total += 1;
      acc.byCategory[item.category] = (acc.byCategory[item.category] ?? 0) + 1;
      acc.bySeverity[item.severity] = (acc.bySeverity[item.severity] ?? 0) + 1;
      return acc;
    },
    { total: 0, byCategory: {} as Record<string, number>, bySeverity: {} as Record<string, number> }
  );

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    filters: { category, search, startDate, endDate, limit },
    warnings,
    summary,
    items: limited,
  });
}
