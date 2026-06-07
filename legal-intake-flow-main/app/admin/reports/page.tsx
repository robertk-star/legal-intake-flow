"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CountMap = Record<string, number>;
type PairRow = { label: string; count: number };

type ReportData = {
  generatedAt: string;
  warnings: string[];
  leadVolume: {
    total: number;
    thisWeek: number;
    thisMonth: number;
    byStatus: CountMap;
    byState: PairRow[];
    byBenefitType: PairRow[];
    bySource: PairRow[];
  };
  assignment: {
    assigned: number;
    unassigned: number;
    assignmentRate: number;
    averageHoursToAssign: number | null;
    byPartner: PairRow[];
    byAssignmentType: CountMap;
    totalAssignmentEvents: number;
  };
  partnerResponse: {
    byStatus: CountMap;
    averageHoursToView: number | null;
    averageHoursToFirstResponse: number | null;
    retainedByPartner: PairRow[];
    declinedByPartner: PairRow[];
  };
  partnerActivity: {
    totalPartnerAccounts: number;
    accountStatusCounts: CountMap;
    leadStatusCounts: CountMap;
    acceptingLeads: { yes: number; no: number; unknown: number };
    totalPartnerUsers: number;
    userStatusCounts: CountMap;
    userRoleCounts: CountMap;
    assignedNotViewedByPartner: PairRow[];
    newAssignedByPartner: PairRow[];
    partnersNearCapacity: Array<{
      partnerId: string;
      firmName: string;
      assignedCount: number;
      monthlyLeadCapacity: string | null;
      usagePercent: number | null;
    }>;
  };
  coverageGaps: {
    statesWithLeadsNoEligiblePartners: Array<{ state: string; leadCount: number }>;
    statesWithEligiblePartnersNoLeads: Array<{ state: string; partnerCount: number }>;
    benefitTypesWithLeadDemandButLowCoverage: Array<{ benefitType: string; leadCount: number }>;
    pausedOrAtCapacityPartners: Array<{
      partnerId: string;
      firmName: string;
      leadStatus: string | null;
      acceptingLeads: boolean | null;
    }>;
  };
  notifications: {
    total: number;
    byStatus: CountMap;
    byType: CountMap;
    recentFailed: Array<{
      id: string;
      createdAt: string;
      notificationType: string | null;
      errorMessage: string | null;
    }>;
  };
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  ready_to_assign: "Ready to Assign",
  assigned: "Assigned",
  closed: "Closed",
  rejected: "Rejected",
  spam: "Spam",
};

const PARTNER_RESPONSE_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  contact_attempted: "Contact Attempted",
  contacted: "Contacted",
  accepted: "Accepted",
  declined: "Declined",
  retained: "Retained",
  closed: "Closed",
};

const ASSIGNMENT_TYPE_LABELS: Record<string, string> = {
  manual: "Manual",
  best_match: "Best Match",
  reassignment: "Reassignment",
};

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  partner_login_link: "Partner Login Link",
  lead_assigned: "Lead Assigned",
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatHours(value: number | null) {
  if (value === null) return "—";
  if (value < 1) return `${Math.round(value * 60)} min`;
  if (value < 48) return `${value.toFixed(1)} hrs`;
  return `${(value / 24).toFixed(1)} days`;
}

function labelize(value: string, labels?: Record<string, string>) {
  return labels?.[value] ?? value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0d1b2e]">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-[#0d1b2e]">{title}</h2>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function CountGrid({ counts, labels }: { counts: CountMap; labels?: Record<string, string> }) {
  const entries = Object.entries(counts);
  if (entries.length === 0) {
    return <EmptyState message="No data yet." />;
  }
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {entries.map(([key, count]) => (
        <div key={key} className="rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wider text-gray-400">{labelize(key, labels)}</p>
          <p className="mt-1 text-2xl font-bold text-[#0d1b2e]">{count}</p>
        </div>
      ))}
    </div>
  );
}

function RankedList({ rows, emptyMessage }: { rows: PairRow[]; emptyMessage: string }) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  const max = Math.max(...rows.map((row) => row.count), 1);
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div key={row.label} className="px-4 py-3">
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-gray-800">{row.label}</span>
              <span className="text-xs font-semibold text-gray-500">{row.count}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-gray-100">
              <div
                className="h-2 rounded-full bg-[#1a3a5c]"
                style={{ width: `${Math.max((row.count / max) * 100, 5)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimpleTable({
  headers,
  rows,
  emptyMessage,
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage: string;
}) {
  if (rows.length === 0) return <EmptyState message={emptyMessage} />;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-left">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-gray-700">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-8 text-center text-sm text-gray-400">
      {message}
    </div>
  );
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Failed to load reports.");
        return;
      }
      setData(payload.data as ReportData);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const summary = useMemo(() => {
    if (!data) return null;
    return {
      unassigned: data.assignment.unassigned,
      assigned: data.assignment.assigned,
      failures: data.notifications.byStatus.failed ?? 0,
      coverageGaps: data.coverageGaps.statesWithLeadsNoEligiblePartners.length,
    };
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
            <a href="/admin/exports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Exports</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/routing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Routing</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/billing/invoices" className="text-gray-600 hover:text-[#0d1b2e]">Invoices</a><a href="/admin/reports" className="text-sm font-semibold text-[#1a3a5c]">Reports</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/disputes" className="text-gray-600 hover:text-[#0d1b2e]">Disputes</a><a href="/admin/billing/statements" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Statements</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
            <a href="/admin/security" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Security</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#0d1b2e]">Reporting & Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Operational visibility for lead volume, assignment performance, partner activity, coverage gaps, and notifications.
            </p>
            {data && <p className="mt-1 text-xs text-gray-400">Generated {formatDateTime(data.generatedAt)}</p>}
          </div>
          <button
            onClick={fetchReport}
            disabled={loading}
            className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white disabled:opacity-50"
          >
            {loading ? "Refreshing…" : "Refresh Reports"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading && !data && (
          <div className="flex items-center justify-center rounded-xl border border-gray-200 bg-white py-20 text-sm text-gray-400 shadow-sm">
            Loading reports…
          </div>
        )}

        {data && (
          <>
            {data.warnings.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4 text-sm text-yellow-800">
                <p className="font-semibold">Report warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {data.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                </ul>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Total Leads" value={data.leadVolume.total} helper={`${data.leadVolume.thisMonth} this month`} />
              <StatCard label="Assignment Rate" value={`${data.assignment.assignmentRate}%`} helper={`${summary?.assigned ?? 0} assigned / ${summary?.unassigned ?? 0} unassigned`} />
              <StatCard label="Active Partners" value={data.partnerActivity.accountStatusCounts.active ?? 0} helper={`${data.partnerActivity.acceptingLeads.yes} accepting leads`} />
              <StatCard label="Failed Emails" value={summary?.failures ?? 0} helper={`${data.notifications.total} total notifications logged`} />
            </div>

            <Section title="Lead Volume" description="Lead intake volume and breakdowns from the DBS-to-LIF pipeline.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="This Week" value={data.leadVolume.thisWeek} />
                <StatCard label="This Month" value={data.leadVolume.thisMonth} />
                <StatCard label="Total Sources" value={data.leadVolume.bySource.length} />
              </div>
              <CountGrid counts={data.leadVolume.byStatus} labels={LEAD_STATUS_LABELS} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Top States</h3>
                  <RankedList rows={data.leadVolume.byState} emptyMessage="No state data yet." />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Benefit Types</h3>
                  <RankedList rows={data.leadVolume.byBenefitType} emptyMessage="No benefit type data yet." />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Sources</h3>
                  <RankedList rows={data.leadVolume.bySource} emptyMessage="No source data yet." />
                </div>
              </div>
            </Section>

            <Section title="Assignment Performance" description="How quickly and how often leads are assigned to partners.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <StatCard label="Assigned" value={data.assignment.assigned} />
                <StatCard label="Unassigned" value={data.assignment.unassigned} />
                <StatCard label="Avg Time to Assign" value={formatHours(data.assignment.averageHoursToAssign)} />
                <StatCard label="Assignment Events" value={data.assignment.totalAssignmentEvents} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Leads Assigned by Partner</h3>
                  <RankedList rows={data.assignment.byPartner} emptyMessage="No assigned leads yet." />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Assignment Type</h3>
                  <CountGrid counts={data.assignment.byAssignmentType} labels={ASSIGNMENT_TYPE_LABELS} />
                </div>
              </div>
            </Section>

            <Section title="Partner Response" description="Partner lead follow-up, retention, declines, and response timing.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Avg Time to View" value={formatHours(data.partnerResponse.averageHoursToView)} />
                <StatCard label="Avg Time to Respond" value={formatHours(data.partnerResponse.averageHoursToFirstResponse)} />
                <StatCard label="Retained Leads" value={data.partnerResponse.byStatus.retained ?? 0} />
              </div>
              <CountGrid counts={data.partnerResponse.byStatus} labels={PARTNER_RESPONSE_LABELS} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Retained by Partner</h3>
                  <RankedList rows={data.partnerResponse.retainedByPartner} emptyMessage="No retained leads yet." />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Declined by Partner</h3>
                  <RankedList rows={data.partnerResponse.declinedByPartner} emptyMessage="No declined leads yet." />
                </div>
              </div>
            </Section>

            <Section title="Partner Activity" description="Partner status, user counts, capacity, and stale assigned leads.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <StatCard label="Partner Accounts" value={data.partnerActivity.totalPartnerAccounts} />
                <StatCard label="Partner Users" value={data.partnerActivity.totalPartnerUsers} />
                <StatCard label="Accepting Leads" value={data.partnerActivity.acceptingLeads.yes} />
                <StatCard label="Not Viewed" value={data.partnerActivity.assignedNotViewedByPartner.reduce((sum, row) => sum + row.count, 0)} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Account Status</h3>
                  <CountGrid counts={data.partnerActivity.accountStatusCounts} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Lead Status</h3>
                  <CountGrid counts={data.partnerActivity.leadStatusCounts} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">User Roles</h3>
                  <CountGrid counts={data.partnerActivity.userRoleCounts} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Assigned Leads Not Viewed</h3>
                  <RankedList rows={data.partnerActivity.assignedNotViewedByPartner} emptyMessage="No unviewed assigned leads." />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">Partners Near Capacity</h3>
                  <SimpleTable
                    headers={["Partner", "Assigned", "Capacity", "Usage"]}
                    rows={data.partnerActivity.partnersNearCapacity.map((partner) => [
                      partner.firmName,
                      partner.assignedCount,
                      partner.monthlyLeadCapacity ?? "—",
                      partner.usagePercent !== null ? `${partner.usagePercent}%` : "—",
                    ])}
                    emptyMessage="No partners are near capacity based on current assigned lead counts."
                  />
                </div>
              </div>
            </Section>

            <Section title="Coverage Gaps" description="Where demand and partner availability do not line up yet.">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SimpleTable
                  headers={["State", "Lead Count"]}
                  rows={data.coverageGaps.statesWithLeadsNoEligiblePartners.map((row) => [row.state, row.leadCount])}
                  emptyMessage="No state coverage gaps found."
                />
                <SimpleTable
                  headers={["State", "Eligible Partner Count"]}
                  rows={data.coverageGaps.statesWithEligiblePartnersNoLeads.map((row) => [row.state, row.partnerCount])}
                  emptyMessage="No unused state coverage found."
                />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <SimpleTable
                  headers={["Benefit Type", "Lead Count"]}
                  rows={data.coverageGaps.benefitTypesWithLeadDemandButLowCoverage.map((row) => [row.benefitType, row.leadCount])}
                  emptyMessage="No benefit-type coverage gaps found."
                />
                <SimpleTable
                  headers={["Partner", "Lead Status", "Accepting Leads"]}
                  rows={data.coverageGaps.pausedOrAtCapacityPartners.map((partner) => [
                    partner.firmName,
                    partner.leadStatus ?? "—",
                    partner.acceptingLeads === true ? "Yes" : partner.acceptingLeads === false ? "No" : "Unknown",
                  ])}
                  emptyMessage="No partners are paused or at capacity."
                />
              </div>
            </Section>

            <Section title="Email Notifications" description="Delivery status for login-link and lead-assignment emails.">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard label="Total Logged" value={data.notifications.total} />
                <StatCard label="Sent" value={data.notifications.byStatus.sent ?? 0} />
                <StatCard label="Failed" value={data.notifications.byStatus.failed ?? 0} />
              </div>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">By Status</h3>
                  <CountGrid counts={data.notifications.byStatus} />
                </div>
                <div>
                  <h3 className="mb-3 text-sm font-semibold text-gray-700">By Type</h3>
                  <CountGrid counts={data.notifications.byType} labels={NOTIFICATION_TYPE_LABELS} />
                </div>
              </div>
              <SimpleTable
                headers={["Created", "Type", "Error"]}
                rows={data.notifications.recentFailed.map((row) => [
                  formatDateTime(row.createdAt),
                  row.notificationType ? labelize(row.notificationType, NOTIFICATION_TYPE_LABELS) : "—",
                  row.errorMessage ?? "—",
                ])}
                emptyMessage="No recent failed notifications."
              />
            </Section>
          </>
        )}
      </main>
    </div>
  );
}
