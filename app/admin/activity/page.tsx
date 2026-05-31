"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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

type ActivityResponse = {
  success: boolean;
  generatedAt: string;
  warnings: string[];
  summary: {
    total: number;
    byCategory: Record<string, number>;
    bySeverity: Record<string, number>;
  };
  items: ActivityItem[];
};

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Activity" },
  { value: "assignment", label: "Assignments" },
  { value: "email", label: "Emails" },
  { value: "billing", label: "Lead Billing" },
  { value: "invoice", label: "Invoices" },
  { value: "dispute", label: "Disputes" },
  { value: "profile", label: "Profiles" },
];

const SEVERITY_COLORS: Record<ActivitySeverity, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-yellow-50 text-yellow-700 border-yellow-200",
  danger: "bg-red-50 text-red-700 border-red-200",
};

const CATEGORY_COLORS: Record<string, string> = {
  assignment: "bg-purple-100 text-purple-800",
  email: "bg-sky-100 text-sky-800",
  billing: "bg-emerald-100 text-emerald-800",
  invoice: "bg-indigo-100 text-indigo-800",
  dispute: "bg-orange-100 text-orange-800",
  profile: "bg-gray-100 text-gray-700",
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

function labelize(value: string | null | undefined) {
  if (!value) return "—";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function todayMinusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
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

function ActivityRow({ item }: { item: ActivityItem }) {
  const [expanded, setExpanded] = useState(false);
  const categoryClass = CATEGORY_COLORS[item.category] ?? "bg-gray-100 text-gray-700";
  const severityClass = SEVERITY_COLORS[item.severity] ?? SEVERITY_COLORS.info;
  const hasMetadata = item.metadata && Object.keys(item.metadata).length > 0;

  return (
    <div className="border-b border-gray-100 px-6 py-4 last:border-b-0">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryClass}`}>
              {labelize(item.category)}
            </span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityClass}`}>
              {labelize(item.severity)}
            </span>
            <span className="text-xs text-gray-400">{formatDateTime(item.occurredAt)}</span>
          </div>
          <h3 className="mt-2 text-sm font-semibold text-[#0d1b2e]">{item.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{item.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
            {item.leadId && <span>Lead: {item.leadId.slice(0, 8)}</span>}
            {item.partnerAccountId && <span>Partner: {item.partnerAccountId.slice(0, 8)}</span>}
            {item.invoiceId && <span>Invoice: {item.invoiceId.slice(0, 8)}</span>}
            {item.disputeId && <span>Dispute: {item.disputeId.slice(0, 8)}</span>}
          </div>
        </div>
        {hasMetadata && (
          <button
            onClick={() => setExpanded((current) => !current)}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
          >
            {expanded ? "Hide Details" : "Details"}
          </button>
        )}
      </div>
      {expanded && hasMetadata && (
        <pre className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 whitespace-pre-wrap break-all">
          {JSON.stringify(item.metadata, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AdminActivityPage() {
  const router = useRouter();
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState(todayMinusDays(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

  const fetchActivity = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    if (startDate) params.set("start_date", new Date(`${startDate}T00:00:00`).toISOString());
    if (endDate) params.set("end_date", new Date(`${endDate}T23:59:59`).toISOString());
    params.set("limit", "200");

    try {
      const response = await fetch(`/api/admin/activity?${params.toString()}`);
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Failed to load activity.");
        return;
      }
      setData(payload as ActivityResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [category, endDate, router, search, startDate]);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  const categorySummary = useMemo(() => {
    if (!data) return [];
    return (Object.entries(data.summary.byCategory) as Array<[string, number]>).sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/invoices" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Invoices</a>
            <a href="/admin/billing/disputes" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Disputes</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/activity" className="text-sm font-semibold text-[#1a3a5c]">Activity</a>
            <a href="/admin/exports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Exports</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0d1b2e]">Activity Timeline</h1>
            <p className="mt-1 text-sm text-gray-500">
              Centralized operational timeline for assignments, emails, billing changes, invoice events, disputes, and profile updates.
            </p>
          </div>
          <button
            onClick={fetchActivity}
            className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard label="Timeline Items" value={data?.summary.total ?? "—"} helper="Current filter window" />
          <StatCard label="Warnings" value={data?.summary.bySeverity.warning ?? 0} helper="Needs review" />
          <StatCard label="Failures" value={data?.summary.bySeverity.danger ?? 0} helper="Failed/skipped/problem events" />
          <StatCard label="Last Refreshed" value={data ? formatDateTime(data.generatedAt) : "—"} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search timeline…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] md:col-span-2"
            />
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            />
            <button
              onClick={fetchActivity}
              className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d1b2e]"
            >
              Apply Filters
            </button>
          </div>
        </div>

        {data?.warnings && data.warnings.length > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            <p className="font-semibold">Some activity sources could not be loaded.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {data.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </div>
        )}

        {categorySummary.length > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Activity by Category</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {categorySummary.map(([name, count]) => (
                <span key={name} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                  {labelize(name)}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading activity…
            </div>
          ) : !data || data.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-medium text-gray-600">No activity found.</p>
              <p className="mt-1 max-w-md text-sm text-gray-400">
                Try expanding the date range or clearing the search/filter controls.
              </p>
            </div>
          ) : (
            <div>
              {data.items.map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
