import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type LeadRow = {
  id: string;
  created_at: string;
  status: string;
  state: string | null;
  benefit_type: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_viewed_at: string | null;
  billable_status: string | null;
};

type PartnerRow = {
  id: string;
  firm_name: string;
  status: string;
  accepting_leads: boolean | null;
  lead_status: string | null;
};

type PartnerRequestRow = {
  id: string;
  created_at: string;
  status: string;
  firm_name: string | null;
  contact_first_name: string | null;
  contact_last_name: string | null;
  email: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string | null;
  created_at: string;
  status: string;
  total_cents: number | null;
  balance_due_cents: number | null;
  due_date: string | null;
  partner_account_id: string | null;
};

type DisputeRow = {
  id: string;
  created_at: string;
  status: string;
  reason: string | null;
  partner_account_id: string | null;
};

type NotificationRow = {
  id: string;
  created_at: string;
  type: string | null;
  status: string;
  recipient_email: string | null;
  subject: string | null;
};

type AssignmentEventRow = {
  id: string;
  created_at: string;
  assignment_type: string | null;
  lead_id: string | null;
  partner_account_id: string | null;
  score: number | null;
};

type QueryResult<T> = {
  rows: T[];
  warning: string | null;
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function isoDaysAgo(days: number) {
  return new Date(Date.now() - days * ONE_DAY_MS).toISOString();
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function countBy<T extends Record<string, unknown>>(rows: T[], key: keyof T) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const value = String(row[key] ?? "unknown");
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

async function safeSelect<T>(
  table: string,
  select: string,
  options: { orderColumn?: string; limit?: number } = {}
): Promise<QueryResult<T>> {
  try {
    let query = supabaseAdmin.from(table).select(select);
    if (options.orderColumn) {
      query = query.order(options.orderColumn, { ascending: false });
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }
    const { data, error } = await query;
    if (error) {
      return { rows: [], warning: `${table}: ${error.message}` };
    }
    return { rows: (data ?? []) as unknown as T[], warning: null };
  } catch (error) {
    return {
      rows: [],
      warning: `${table}: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

function firmName(partnerId: string | null, partnerMap: Map<string, string>) {
  if (!partnerId) return "Unassigned";
  return partnerMap.get(partnerId) ?? "Unknown Partner";
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const [
    leadsResult,
    partnersResult,
    requestsResult,
    invoicesResult,
    disputesResult,
    notificationsResult,
    assignmentsResult,
  ] = await Promise.all([
    safeSelect<LeadRow>(
      "leads",
      "id, created_at, status, state, benefit_type, assigned_partner_account_id, assigned_at, partner_response_status, partner_viewed_at, billable_status",
      { orderColumn: "created_at", limit: 1000 }
    ),
    safeSelect<PartnerRow>(
      "partner_accounts",
      "id, firm_name, status, accepting_leads, lead_status",
      { orderColumn: "created_at", limit: 500 }
    ),
    safeSelect<PartnerRequestRow>(
      "partner_access_requests",
      "id, created_at, status, firm_name, contact_first_name, contact_last_name, email",
      { orderColumn: "created_at", limit: 100 }
    ),
    safeSelect<InvoiceRow>(
      "partner_billing_invoices",
      "id, invoice_number, created_at, status, total_cents, balance_due_cents, due_date, partner_account_id",
      { orderColumn: "created_at", limit: 500 }
    ),
    safeSelect<DisputeRow>(
      "partner_billing_disputes",
      "id, created_at, status, reason, partner_account_id",
      { orderColumn: "created_at", limit: 100 }
    ),
    safeSelect<NotificationRow>(
      "email_notifications",
      "id, created_at, type, status, recipient_email, subject",
      { orderColumn: "created_at", limit: 100 }
    ),
    safeSelect<AssignmentEventRow>(
      "lead_assignment_events",
      "id, created_at, assignment_type, lead_id, partner_account_id, score",
      { orderColumn: "created_at", limit: 100 }
    ),
  ]);

  const warnings = [
    leadsResult.warning,
    partnersResult.warning,
    requestsResult.warning,
    invoicesResult.warning,
    disputesResult.warning,
    notificationsResult.warning,
    assignmentsResult.warning,
  ].filter(Boolean) as string[];

  const leads = leadsResult.rows;
  const partners = partnersResult.rows;
  const requests = requestsResult.rows;
  const invoices = invoicesResult.rows;
  const disputes = disputesResult.rows;
  const notifications = notificationsResult.rows;
  const assignments = assignmentsResult.rows;

  const partnerMap = new Map(partners.map((partner) => [partner.id, partner.firm_name]));
  const now = new Date();
  const todayStart = startOfToday();
  const sevenDaysAgoIso = isoDaysAgo(7);
  const thirtyDaysAgoIso = isoDaysAgo(30);

  const leadStatuses = countBy(leads, "status");
  const requestStatuses = countBy(requests, "status");
  const invoiceStatuses = countBy(invoices, "status");
  const disputeStatuses = countBy(disputes, "status");
  const notificationStatuses = countBy(notifications, "status");

  const unassignedLeads = leads.filter((lead) => !lead.assigned_partner_account_id);
  const readyToAssignLeads = leads.filter((lead) => lead.status === "ready_to_assign");
  const newLeads = leads.filter((lead) => lead.status === "new");
  const assignedNotViewed = leads.filter(
    (lead) => lead.assigned_partner_account_id && !lead.partner_viewed_at
  );
  const openInvoices = invoices.filter((invoice) => ["sent", "partially_paid"].includes(invoice.status));
  const overdueInvoices = openInvoices.filter((invoice) => {
    if (!invoice.due_date) return false;
    return new Date(`${invoice.due_date}T23:59:59.999Z`) < now && (invoice.balance_due_cents ?? 0) > 0;
  });
  const openDisputes = disputes.filter((dispute) => ["open", "in_review"].includes(dispute.status));
  const failedNotifications = notifications.filter((notification) => notification.status === "failed");

  const leadsThisWeek = leads.filter((lead) => lead.created_at >= sevenDaysAgoIso).length;
  const leadsThisMonth = leads.filter((lead) => lead.created_at >= thirtyDaysAgoIso).length;
  const leadsToday = leads.filter((lead) => new Date(lead.created_at) >= todayStart).length;
  const activePartners = partners.filter((partner) => partner.status === "active");
  const acceptingPartners = partners.filter(
    (partner) => partner.status === "active" && partner.accepting_leads === true && partner.lead_status !== "paused"
  );
  const openBalanceCents = openInvoices.reduce((sum, invoice) => sum + (invoice.balance_due_cents ?? 0), 0);

  const actionItems = [
    {
      key: "new-leads",
      title: "New leads to review",
      count: newLeads.length,
      severity: newLeads.length > 0 ? "action" : "ok",
      href: "/admin/leads?status=new",
      description: "DBS leads waiting for admin review.",
    },
    {
      key: "ready-to-assign",
      title: "Ready to assign",
      count: readyToAssignLeads.length,
      severity: readyToAssignLeads.length > 0 ? "action" : "ok",
      href: "/admin/leads?status=ready_to_assign",
      description: "Leads ready for partner assignment.",
    },
    {
      key: "unassigned-leads",
      title: "Unassigned leads",
      count: unassignedLeads.length,
      severity: unassignedLeads.length > 0 ? "review" : "ok",
      href: "/admin/leads?assigned=false",
      description: "Leads without an assigned partner.",
    },
    {
      key: "not-viewed",
      title: "Assigned but not viewed",
      count: assignedNotViewed.length,
      severity: assignedNotViewed.length > 0 ? "review" : "ok",
      href: "/admin/leads",
      description: "Assigned leads partners have not opened yet.",
    },
    {
      key: "failed-emails",
      title: "Failed emails",
      count: failedNotifications.length,
      severity: failedNotifications.length > 0 ? "problem" : "ok",
      href: "/admin/notifications?status=failed",
      description: "Email delivery attempts needing review.",
    },
    {
      key: "overdue-invoices",
      title: "Overdue invoices",
      count: overdueInvoices.length,
      severity: overdueInvoices.length > 0 ? "problem" : "ok",
      href: "/admin/billing/invoices",
      description: "Sent or partially paid invoices past due.",
    },
    {
      key: "open-disputes",
      title: "Open disputes",
      count: openDisputes.length,
      severity: openDisputes.length > 0 ? "action" : "ok",
      href: "/admin/billing/disputes",
      description: "Partner billing questions needing resolution.",
    },
    {
      key: "partner-requests",
      title: "Pending partner requests",
      count: (requestStatuses.new ?? 0) + (requestStatuses.pending ?? 0),
      severity: (requestStatuses.new ?? 0) + (requestStatuses.pending ?? 0) > 0 ? "review" : "ok",
      href: "/admin/partner-requests",
      description: "Partner access requests awaiting action.",
    },
  ];

  const topPartnerAssignments = Object.entries(
    leads.reduce<Record<string, number>>((acc, lead) => {
      if (!lead.assigned_partner_account_id) return acc;
      const name = firmName(lead.assigned_partner_account_id, partnerMap);
      acc[name] = (acc[name] ?? 0) + 1;
      return acc;
    }, {})
  )
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const recentLeads = leads.slice(0, 8).map((lead) => ({
    id: lead.id,
    created_at: lead.created_at,
    title: `${lead.state ?? "Unknown state"} ${lead.benefit_type ?? "lead"}`,
    status: lead.status,
    partner: firmName(lead.assigned_partner_account_id, partnerMap),
  }));

  const recentNotifications = notifications.slice(0, 6).map((notification) => ({
    id: notification.id,
    created_at: notification.created_at,
    type: notification.type ?? "notification",
    status: notification.status,
    recipient: notification.recipient_email,
    subject: notification.subject,
  }));

  const recentAssignments = assignments.slice(0, 6).map((assignment) => ({
    id: assignment.id,
    created_at: assignment.created_at,
    type: assignment.assignment_type ?? "assignment",
    partner: firmName(assignment.partner_account_id, partnerMap),
    score: assignment.score,
  }));

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    warnings,
    stats: {
      totalLeads: leads.length,
      leadsToday,
      leadsThisWeek,
      leadsThisMonth,
      assignedLeads: leads.filter((lead) => Boolean(lead.assigned_partner_account_id)).length,
      unassignedLeads: unassignedLeads.length,
      activePartners: activePartners.length,
      acceptingPartners: acceptingPartners.length,
      pendingPartnerRequests: (requestStatuses.new ?? 0) + (requestStatuses.pending ?? 0),
      failedNotifications: failedNotifications.length,
      openDisputes: openDisputes.length,
      overdueInvoices: overdueInvoices.length,
      openInvoiceBalanceLabel: formatCurrency(openBalanceCents),
    },
    counts: {
      leadStatuses,
      requestStatuses,
      invoiceStatuses,
      disputeStatuses,
      notificationStatuses,
    },
    actionItems,
    topPartnerAssignments,
    recentLeads,
    recentNotifications,
    recentAssignments,
  });
}
