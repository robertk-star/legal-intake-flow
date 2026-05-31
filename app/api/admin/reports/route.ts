import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type JsonRow = Record<string, unknown>;

type LeadRow = {
  id: string;
  created_at: string;
  source: string | null;
  state: string | null;
  benefit_type: string | null;
  status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_response_updated_at: string | null;
  partner_viewed_at: string | null;
  assignment_notification_sent_at: string | null;
  assignment_notification_count: number | null;
};

type PartnerRow = {
  id: string;
  firm_name: string | null;
  status: string | null;
  accepting_leads: boolean | null;
  lead_status: string | null;
  monthly_lead_capacity: string | null;
  routing_states: string[] | null;
  accepted_case_types: string[] | null;
  created_at: string | null;
  last_login_at: string | null;
};

type PartnerUserRow = {
  id: string;
  partner_account_id: string;
  role: string | null;
  status: string | null;
  last_login_at: string | null;
};

type AssignmentEventRow = {
  id: string;
  created_at: string;
  lead_id: string;
  partner_account_id: string | null;
  assignment_type: string | null;
  score: number | null;
};

type EmailNotificationRow = {
  id: string;
  created_at: string;
  notification_type: string | null;
  status: string | null;
  sent_at: string | null;
  error_message: string | null;
};

const LEAD_STATUSES = ["new", "reviewing", "ready_to_assign", "assigned", "closed", "rejected", "spam"];
const PARTNER_RESPONSE_STATUSES = [
  "new",
  "reviewing",
  "contact_attempted",
  "contacted",
  "accepted",
  "declined",
  "retained",
  "closed",
];
const PARTNER_ACCOUNT_STATUSES = ["active", "inactive", "pending", "suspended"];
const PARTNER_LEAD_STATUSES = ["active", "paused", "at_capacity"];
const NOTIFICATION_STATUSES = ["queued", "sent", "failed", "skipped"];
const NOTIFICATION_TYPES = ["partner_login_link", "lead_assigned"];

function inc(map: Record<string, number>, key: string | null | undefined, fallback = "Unknown") {
  const normalized = key && key.trim() ? key.trim() : fallback;
  map[normalized] = (map[normalized] ?? 0) + 1;
}

function topEntries(map: Record<string, number>, limit = 10) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

function countKnown(values: string[], rows: Array<string | null | undefined>) {
  const out: Record<string, number> = {};
  for (const value of values) out[value] = 0;
  for (const row of rows) {
    const key = row ?? "Unknown";
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function isoMs(value: string | null | undefined) {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function averageHoursBetween(rows: LeadRow[], startKey: keyof LeadRow, endKey: keyof LeadRow) {
  const hours: number[] = [];
  for (const row of rows) {
    const start = isoMs(row[startKey] as string | null);
    const end = isoMs(row[endKey] as string | null);
    if (start !== null && end !== null && end >= start) {
      hours.push((end - start) / (1000 * 60 * 60));
    }
  }
  if (hours.length === 0) return null;
  return Math.round((hours.reduce((sum, value) => sum + value, 0) / hours.length) * 10) / 10;
}

function parseCapacity(value: string | null | undefined) {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

async function optionalSelect<T>(table: string, select: string): Promise<{ rows: T[]; warning: string | null }> {
  const { data, error } = await supabaseAdmin.from(table).select(select).limit(5000);
  if (error) {
    console.warn(`[GET /api/admin/reports] Optional table ${table} unavailable:`, error);
    return { rows: [], warning: `Could not load ${table}. Confirm the related SQL migration has been run.` };
  }
  return { rows: (data ?? []) as unknown as T[], warning: null };
}

/**
 * GET /api/admin/reports
 *
 * Returns operational reporting data for LIF admin dashboards.
 * Uses existing LIF tables only; no new schema required for Phase 15.
 */
export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const warnings: string[] = [];

  const leadsResult = await supabaseAdmin
    .from("leads")
    .select(
      "id, created_at, source, state, benefit_type, status, assigned_partner_account_id, assigned_at, " +
      "partner_response_status, partner_response_updated_at, partner_viewed_at, " +
      "assignment_notification_sent_at, assignment_notification_count"
    )
    .limit(5000);

  if (leadsResult.error) {
    console.error("[GET /api/admin/reports] Leads error:", leadsResult.error);
    return NextResponse.json(
      { error: "Failed to load lead reporting data. Confirm lead migrations through section12 have been run." },
      { status: 500 }
    );
  }

  const partnersResult = await supabaseAdmin
    .from("partner_accounts")
    .select(
      "id, firm_name, status, accepting_leads, lead_status, monthly_lead_capacity, " +
      "routing_states, accepted_case_types, created_at, last_login_at"
    )
    .limit(5000);

  if (partnersResult.error) {
    console.error("[GET /api/admin/reports] Partners error:", partnersResult.error);
    return NextResponse.json({ error: "Failed to load partner reporting data." }, { status: 500 });
  }

  const usersResult = await optionalSelect<PartnerUserRow>(
    "partner_users",
    "id, partner_account_id, role, status, last_login_at"
  );
  if (usersResult.warning) warnings.push(usersResult.warning);

  const assignmentsResult = await optionalSelect<AssignmentEventRow>(
    "lead_assignment_events",
    "id, created_at, lead_id, partner_account_id, assignment_type, score"
  );
  if (assignmentsResult.warning) warnings.push(assignmentsResult.warning);

  const notificationsResult = await optionalSelect<EmailNotificationRow>(
    "email_notifications",
    "id, created_at, notification_type, status, sent_at, error_message"
  );
  if (notificationsResult.warning) warnings.push(notificationsResult.warning);

  const leads = (leadsResult.data ?? []) as unknown as LeadRow[];
  const partners = (partnersResult.data ?? []) as unknown as PartnerRow[];
  const partnerUsers = usersResult.rows;
  const assignmentEvents = assignmentsResult.rows;
  const notifications = notificationsResult.rows;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthStart = startOfMonth();

  const leadsThisWeek = leads.filter((lead) => (isoMs(lead.created_at) ?? 0) >= sevenDaysAgo).length;
  const leadsThisMonth = leads.filter((lead) => (isoMs(lead.created_at) ?? 0) >= monthStart).length;
  const assignedLeads = leads.filter((lead) => Boolean(lead.assigned_partner_account_id));
  const unassignedLeads = leads.length - assignedLeads.length;

  const byState: Record<string, number> = {};
  const byBenefit: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  for (const lead of leads) {
    inc(byState, lead.state?.toUpperCase());
    inc(byBenefit, lead.benefit_type);
    inc(bySource, lead.source);
  }

  const partnerById = new Map(partners.map((partner) => [partner.id, partner]));
  const assignedByPartner: Record<string, number> = {};
  const retainedByPartner: Record<string, number> = {};
  const declinedByPartner: Record<string, number> = {};
  const newAssignedByPartner: Record<string, number> = {};
  const notViewedByPartner: Record<string, number> = {};

  for (const lead of leads) {
    const partnerName = lead.assigned_partner_account_id
      ? partnerById.get(lead.assigned_partner_account_id)?.firm_name ?? "Unknown Partner"
      : null;
    if (partnerName) {
      assignedByPartner[partnerName] = (assignedByPartner[partnerName] ?? 0) + 1;
      if ((lead.partner_response_status ?? "new") === "retained") {
        retainedByPartner[partnerName] = (retainedByPartner[partnerName] ?? 0) + 1;
      }
      if ((lead.partner_response_status ?? "new") === "declined") {
        declinedByPartner[partnerName] = (declinedByPartner[partnerName] ?? 0) + 1;
      }
      if ((lead.partner_response_status ?? "new") === "new") {
        newAssignedByPartner[partnerName] = (newAssignedByPartner[partnerName] ?? 0) + 1;
      }
      if (!lead.partner_viewed_at) {
        notViewedByPartner[partnerName] = (notViewedByPartner[partnerName] ?? 0) + 1;
      }
    }
  }

  const assignmentTypes = countKnown(
    ["manual", "best_match", "reassignment"],
    assignmentEvents.map((event) => event.assignment_type)
  );

  const partnerStatuses = countKnown(PARTNER_ACCOUNT_STATUSES, partners.map((partner) => partner.status));
  const partnerLeadStatuses = countKnown(PARTNER_LEAD_STATUSES, partners.map((partner) => partner.lead_status));
  const acceptingLeadCounts = {
    yes: partners.filter((partner) => partner.accepting_leads === true).length,
    no: partners.filter((partner) => partner.accepting_leads === false).length,
    unknown: partners.filter((partner) => partner.accepting_leads === null).length,
  };

  const userStatuses = countKnown(["active", "inactive", "pending", "suspended"], partnerUsers.map((user) => user.status));
  const userRoles = countKnown(["owner", "admin", "staff", "viewer"], partnerUsers.map((user) => user.role));

  const activeRoutingPartners = partners.filter(
    (partner) =>
      (partner.status === "active" || partner.status === "pending") &&
      partner.accepting_leads !== false &&
      (partner.lead_status ?? "active") === "active"
  );

  const statesWithLeads = new Set(leads.map((lead) => lead.state?.toUpperCase()).filter(Boolean) as string[]);
  const statesWithPartnerRouting = new Set<string>();
  for (const partner of activeRoutingPartners) {
    for (const state of partner.routing_states ?? []) {
      if (state) statesWithPartnerRouting.add(state.toUpperCase());
    }
  }

  const statesWithLeadsNoPartners = [...statesWithLeads]
    .filter((state) => !statesWithPartnerRouting.has(state))
    .sort()
    .map((state) => ({ state, leadCount: byState[state] ?? 0 }));

  const statesWithPartnersNoLeads = [...statesWithPartnerRouting]
    .filter((state) => !statesWithLeads.has(state))
    .sort()
    .map((state) => ({ state, partnerCount: activeRoutingPartners.filter((partner) => (partner.routing_states ?? []).includes(state)).length }));

  const benefitTypesWithLeads = new Set(leads.map((lead) => lead.benefit_type).filter(Boolean) as string[]);
  const benefitTypesWithPartners = new Set<string>();
  for (const partner of activeRoutingPartners) {
    for (const benefit of partner.accepted_case_types ?? []) {
      benefitTypesWithPartners.add(benefit);
    }
  }
  const benefitCoverageGaps = [...benefitTypesWithLeads]
    .filter((benefit) => {
      if (benefit === "Both") return !(benefitTypesWithPartners.has("SSDI") && benefitTypesWithPartners.has("SSI"));
      if (benefit === "Not Sure") return activeRoutingPartners.length === 0;
      return !benefitTypesWithPartners.has(benefit);
    })
    .sort()
    .map((benefit) => ({ benefitType: benefit, leadCount: byBenefit[benefit] ?? 0 }));

  const partnersNearCapacity = partners
    .map((partner) => {
      const assignedCount = leads.filter((lead) => lead.assigned_partner_account_id === partner.id).length;
      const capacity = parseCapacity(partner.monthly_lead_capacity);
      const usage = capacity && capacity > 0 ? Math.round((assignedCount / capacity) * 100) : null;
      return {
        partnerId: partner.id,
        firmName: partner.firm_name ?? "Unnamed Partner",
        assignedCount,
        monthlyLeadCapacity: partner.monthly_lead_capacity,
        usagePercent: usage,
      };
    })
    .filter((row) => row.usagePercent !== null && row.usagePercent >= 80)
    .sort((a, b) => (b.usagePercent ?? 0) - (a.usagePercent ?? 0));

  const notificationStatusCounts = countKnown(NOTIFICATION_STATUSES, notifications.map((item) => item.status));
  const notificationTypeCounts = countKnown(NOTIFICATION_TYPES, notifications.map((item) => item.notification_type));
  const recentFailedNotifications = notifications
    .filter((item) => item.status === "failed")
    .slice(0, 10)
    .map((item) => ({
      id: item.id,
      createdAt: item.created_at,
      notificationType: item.notification_type,
      errorMessage: item.error_message,
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    warnings,
    leadVolume: {
      total: leads.length,
      thisWeek: leadsThisWeek,
      thisMonth: leadsThisMonth,
      byStatus: countKnown(LEAD_STATUSES, leads.map((lead) => lead.status)),
      byState: topEntries(byState, 20),
      byBenefitType: topEntries(byBenefit, 10),
      bySource: topEntries(bySource, 10),
    },
    assignment: {
      assigned: assignedLeads.length,
      unassigned: unassignedLeads,
      assignmentRate: leads.length ? Math.round((assignedLeads.length / leads.length) * 1000) / 10 : 0,
      averageHoursToAssign: averageHoursBetween(assignedLeads, "created_at", "assigned_at"),
      byPartner: topEntries(assignedByPartner, 20),
      byAssignmentType: assignmentTypes,
      totalAssignmentEvents: assignmentEvents.length,
    },
    partnerResponse: {
      byStatus: countKnown(PARTNER_RESPONSE_STATUSES, assignedLeads.map((lead) => lead.partner_response_status ?? "new")),
      averageHoursToView: averageHoursBetween(assignedLeads, "assigned_at", "partner_viewed_at"),
      averageHoursToFirstResponse: averageHoursBetween(assignedLeads, "assigned_at", "partner_response_updated_at"),
      retainedByPartner: topEntries(retainedByPartner, 20),
      declinedByPartner: topEntries(declinedByPartner, 20),
    },
    partnerActivity: {
      totalPartnerAccounts: partners.length,
      accountStatusCounts: partnerStatuses,
      leadStatusCounts: partnerLeadStatuses,
      acceptingLeads: acceptingLeadCounts,
      totalPartnerUsers: partnerUsers.length,
      userStatusCounts: userStatuses,
      userRoleCounts: userRoles,
      assignedNotViewedByPartner: topEntries(notViewedByPartner, 20),
      newAssignedByPartner: topEntries(newAssignedByPartner, 20),
      partnersNearCapacity,
    },
    coverageGaps: {
      statesWithLeadsNoEligiblePartners: statesWithLeadsNoPartners,
      statesWithEligiblePartnersNoLeads: statesWithPartnersNoLeads,
      benefitTypesWithLeadDemandButLowCoverage: benefitCoverageGaps,
      pausedOrAtCapacityPartners: partners
        .filter((partner) => partner.lead_status === "paused" || partner.lead_status === "at_capacity")
        .map((partner) => ({
          partnerId: partner.id,
          firmName: partner.firm_name ?? "Unnamed Partner",
          leadStatus: partner.lead_status,
          acceptingLeads: partner.accepting_leads,
        })),
    },
    notifications: {
      total: notifications.length,
      byStatus: notificationStatusCounts,
      byType: notificationTypeCounts,
      recentFailed: recentFailedNotifications,
    },
  };

  return NextResponse.json({ success: true, data: report });
}
