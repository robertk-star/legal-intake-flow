"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Severity = "ok" | "review" | "action" | "problem";

type ActionItem = {
  key: string;
  title: string;
  count: number;
  severity: Severity;
  href: string;
  description: string;
};

type DashboardData = {
  generatedAt: string;
  warnings: string[];
  stats: {
    totalLeads: number;
    leadsToday: number;
    leadsThisWeek: number;
    leadsThisMonth: number;
    assignedLeads: number;
    unassignedLeads: number;
    activePartners: number;
    acceptingPartners: number;
    pendingPartnerRequests: number;
    failedNotifications: number;
    openDisputes: number;
    overdueInvoices: number;
    openInvoiceBalanceLabel: string;
  };
  counts: {
    leadStatuses: Record<string, number>;
    requestStatuses: Record<string, number>;
    invoiceStatuses: Record<string, number>;
    disputeStatuses: Record<string, number>;
    notificationStatuses: Record<string, number>;
  };
  actionItems: ActionItem[];
  topPartnerAssignments: Array<{ label: string; count: number }>;
  recentLeads: Array<{ id: string; created_at: string; title: string; status: string; partner: string }>;
  recentNotifications: Array<{ id: string; created_at: string; type: string; status: string; recipient: string | null; subject: string | null }>;
  recentAssignments: Array<{ id: string; created_at: string; type: string; partner: string; score: number | null }>;
};

const SEVERITY_CLASSES: Record<Severity, string> = {
  ok: "border-green-200 bg-green-50 text-green-800",
  review: "border-yellow-200 bg-yellow-50 text-yellow-800",
  action: "border-blue-200 bg-blue-50 text-blue-800",
  problem: "border-red-200 bg-red-50 text-red-800",
};

const SEVERITY_LABELS: Record<Severity, string> = {
  ok: "OK",
  review: "Review",
  action: "Action",
  problem: "Problem",
};

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({ label, value, helper }: { label: string; value: string | number; helper?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0d1b2e]">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function CountList({ counts, empty }: { counts: Record<string, number>; empty: string }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (rows.length === 0) {
    return <p className="text-sm italic text-gray-400">{empty}</p>;
  }
  return (
    <div className="space-y-2">
      {rows.map(([label, count]) => (
        <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-sm">
          <span className="text-gray-600 capitalize">{label.replace(/_/g, " ")}</span>
          <span className="font-semibold text-[#0d1b2e]">{count}</span>
        </div>
      ))}
    </div>
  );
}

function AdminNav() {
  return (
    <nav className="flex flex-wrap items-center gap-4">
      <a href="/admin" className="text-sm font-semibold text-[#1a3a5c]">Dashboard</a>
      <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
      <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
      <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
      <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
      <a href="/admin/billing/invoices" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Invoices</a>
      <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
      <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
      <a href="/admin/exports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Exports</a>
      <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
    </nav>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/dashboard");
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Failed to load admin dashboard.");
        return;
      }
      setData(payload as DashboardData);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const topActionItems = useMemo(
    () => (data?.actionItems ?? []).filter((item) => item.count > 0 || item.severity !== "ok"),
    [data]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#0d1b2e]">Legal Intake Flow Admin</h1>
              <p className="mt-1 text-sm text-gray-500">Operational dashboard and priority queue.</p>
            </div>
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
            Loading admin dashboard…
          </div>
        ) : data ? (
          <>
            {data.warnings.length > 0 && (
              <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                <p className="font-semibold">Dashboard loaded with warnings.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {data.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}

            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
              <StatCard label="Total Leads" value={data.stats.totalLeads} helper={`${data.stats.leadsThisMonth} this month`} />
              <StatCard label="Today" value={data.stats.leadsToday} helper={`${data.stats.leadsThisWeek} this week`} />
              <StatCard label="Unassigned" value={data.stats.unassignedLeads} helper={`${data.stats.assignedLeads} assigned`} />
              <StatCard label="Active Partners" value={data.stats.activePartners} helper={`${data.stats.acceptingPartners} accepting leads`} />
              <StatCard label="Open Balance" value={data.stats.openInvoiceBalanceLabel} helper={`${data.stats.overdueInvoices} overdue invoices`} />
              <StatCard label="Open Disputes" value={data.stats.openDisputes} helper={`${data.stats.failedNotifications} failed emails`} />
            </section>

            <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
              <div className="xl:col-span-2 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#0d1b2e]">Action Center</h2>
                    <p className="mt-1 text-sm text-gray-500">Items that may need admin attention.</p>
                  </div>
                  <button
                    onClick={fetchDashboard}
                    className="rounded-lg border border-[#1a3a5c] px-3 py-2 text-xs font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white"
                  >
                    Refresh
                  </button>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {(topActionItems.length > 0 ? topActionItems : data.actionItems).map((item) => (
                    <a
                      key={item.key}
                      href={item.href}
                      className="rounded-xl border border-gray-200 bg-gray-50 p-4 transition hover:border-[#1a3a5c] hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[#0d1b2e]">{item.title}</p>
                          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-[#0d1b2e]">{item.count}</p>
                          <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${SEVERITY_CLASSES[item.severity]}`}>
                            {SEVERITY_LABELS[item.severity]}
                          </span>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Lead Status</h2>
                <p className="mt-1 text-sm text-gray-500">Current lead queue distribution.</p>
                <div className="mt-4">
                  <CountList counts={data.counts.leadStatuses} empty="No leads yet." />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Partner Assignments</h2>
                <p className="mt-1 text-sm text-gray-500">Top assigned partner accounts.</p>
                <div className="mt-4 space-y-2">
                  {data.topPartnerAssignments.length === 0 ? (
                    <p className="text-sm italic text-gray-400">No partner assignments yet.</p>
                  ) : (
                    data.topPartnerAssignments.map((row) => (
                      <div key={row.label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm">
                        <span className="truncate text-gray-600">{row.label}</span>
                        <span className="font-semibold text-[#0d1b2e]">{row.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Billing Snapshot</h2>
                <div className="mt-4 grid grid-cols-1 gap-4">
                  <CountList counts={data.counts.invoiceStatuses} empty="No invoices yet." />
                  <CountList counts={data.counts.disputeStatuses} empty="No disputes yet." />
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Notifications</h2>
                <p className="mt-1 text-sm text-gray-500">Email delivery status.</p>
                <div className="mt-4">
                  <CountList counts={data.counts.notificationStatuses} empty="No notifications yet." />
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <RecentCard
                title="Recent Leads"
                empty="No recent leads."
                rows={data.recentLeads.map((lead) => ({
                  key: lead.id,
                  title: lead.title,
                  subtitle: `${lead.status.replace(/_/g, " ")} · ${lead.partner}`,
                  date: formatDateTime(lead.created_at),
                }))}
              />
              <RecentCard
                title="Recent Assignments"
                empty="No recent assignments."
                rows={data.recentAssignments.map((assignment) => ({
                  key: assignment.id,
                  title: assignment.type.replace(/_/g, " "),
                  subtitle: `${assignment.partner}${assignment.score != null ? ` · score ${assignment.score}` : ""}`,
                  date: formatDateTime(assignment.created_at),
                }))}
              />
              <RecentCard
                title="Recent Emails"
                empty="No recent email attempts."
                rows={data.recentNotifications.map((notification) => ({
                  key: notification.id,
                  title: `${notification.type.replace(/_/g, " ")} · ${notification.status}`,
                  subtitle: notification.recipient ?? notification.subject ?? "No recipient recorded",
                  date: formatDateTime(notification.created_at),
                }))}
              />
            </section>

            <p className="text-center text-xs text-gray-400">
              Last refreshed {formatDateTime(data.generatedAt)}. This dashboard is read-only and does not automate lead routing or billing actions.
            </p>
          </>
        ) : null}
      </main>
    </div>
  );
}

function RecentCard({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: Array<{ key: string; title: string; subtitle: string; date: string }>;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-base font-semibold text-[#0d1b2e]">{title}</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 ? (
          <p className="text-sm italic text-gray-400">{empty}</p>
        ) : (
          rows.map((row) => (
            <div key={row.key} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium capitalize text-[#0d1b2e]">{row.title}</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">{row.subtitle}</p>
                </div>
                <span className="shrink-0 text-xs text-gray-400">{row.date}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
