"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ExportDataset = {
  id: string;
  label: string;
  description: string;
  dateColumn: string;
  supportsPartnerFilter: boolean;
  supportsStatusFilter: boolean;
};

type CatalogResponse = {
  success: boolean;
  generatedAt: string;
  datasets: ExportDataset[];
  limits: {
    default: number;
    maximum: number;
  };
};

const STATUS_OPTIONS: Record<string, string[]> = {
  leads: ["new", "reviewing", "ready_to_assign", "assigned", "closed", "rejected", "spam"],
  partners: ["active", "inactive", "pending", "suspended"],
  partner_users: ["active", "inactive", "pending", "suspended"],
  invoices: ["draft", "sent", "partially_paid", "paid", "void"],
  disputes: ["open", "in_review", "resolved", "declined"],
  notifications: ["queued", "sent", "failed", "skipped"],
};

function todayMinusDays(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
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

export default function AdminExportsPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataset, setDataset] = useState("leads");
  const [startDate, setStartDate] = useState(todayMinusDays(30));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [partnerId, setPartnerId] = useState("");
  const [status, setStatus] = useState("");
  const [limit, setLimit] = useState("1000");

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/exports");
      if (response.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Failed to load export catalog.");
        return;
      }
      setCatalog(payload as CatalogResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  const selectedDataset = useMemo(() => {
    return catalog?.datasets.find((item) => item.id === dataset) ?? null;
  }, [catalog, dataset]);

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set("dataset", dataset);
    if (startDate) params.set("start_date", startDate);
    if (endDate) params.set("end_date", endDate);
    if (selectedDataset?.supportsPartnerFilter && partnerId.trim()) params.set("partner_account_id", partnerId.trim());
    if (selectedDataset?.supportsStatusFilter && status) params.set("status", status);
    if (limit) params.set("limit", limit);
    return `/api/admin/exports/download?${params.toString()}`;
  }, [dataset, endDate, limit, partnerId, selectedDataset, startDate, status]);

  const statusOptions = STATUS_OPTIONS[dataset] ?? [];

  useEffect(() => {
    setStatus("");
    setPartnerId("");
  }, [dataset]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-5">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/invoices" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Invoices</a>
            <a href="/admin/billing/disputes" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Disputes</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
            <a href="/admin/exports" className="text-sm font-semibold text-[#1a3a5c]">Exports</a>
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
            <h1 className="text-2xl font-bold text-[#0d1b2e]">Data Export Center</h1>
            <p className="mt-1 text-sm text-gray-500">
              Generate controlled CSV exports for lead operations, partner management, billing, invoices, notifications, and audit review.
            </p>
          </div>
          <button
            onClick={fetchCatalog}
            className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white"
          >
            Refresh Catalog
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Available Datasets" value={catalog?.datasets.length ?? "—"} helper="Admin-controlled CSV exports" />
          <StatCard label="Default Limit" value={catalog?.limits.default ?? "—"} helper="Rows per export unless changed" />
          <StatCard label="Maximum Limit" value={catalog?.limits.maximum ?? "—"} helper="Hard cap per export request" />
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#0d1b2e]">Create Export</h2>
            <p className="mt-1 text-sm text-gray-500">
              Choose a dataset and optional filters. Exports are generated live from the current production database.
            </p>
          </div>

          <div className="space-y-5 px-6 py-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Dataset</label>
                <select
                  value={dataset}
                  onChange={(event) => setDataset(event.target.value)}
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                >
                  {(catalog?.datasets ?? []).map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
                {selectedDataset && (
                  <p className="mt-2 text-xs text-gray-500">{selectedDataset.description}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Row Limit</label>
                <input
                  type="number"
                  min="1"
                  max={catalog?.limits.maximum ?? 10000}
                  value={limit}
                  onChange={(event) => setLimit(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
                <p className="mt-2 text-xs text-gray-500">Maximum {catalog?.limits.maximum ?? 10000} rows per download.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Status Filter</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  disabled={!selectedDataset?.supportsStatusFilter}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                >
                  <option value="">All Statuses</option>
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>{labelize(option)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Partner ID Filter</label>
                <input
                  type="text"
                  value={partnerId}
                  onChange={(event) => setPartnerId(event.target.value)}
                  disabled={!selectedDataset?.supportsPartnerFilter}
                  placeholder={selectedDataset?.supportsPartnerFilter ? "Optional partner UUID" : "Not supported"}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              CSV exports are protected by admin authentication. Dangerous spreadsheet formulas are escaped before download.
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href={exportUrl}
                className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d1b2e]"
              >
                Download CSV
              </a>
              <button
                type="button"
                onClick={() => {
                  setStartDate(todayMinusDays(30));
                  setEndDate(new Date().toISOString().slice(0, 10));
                  setPartnerId("");
                  setStatus("");
                  setLimit("1000");
                }}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-500 hover:bg-gray-50"
              >
                Reset Filters
              </button>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-[#0d1b2e]">Export Catalog</h2>
            <p className="mt-1 text-sm text-gray-500">Available operational datasets and supported filters.</p>
          </div>
          {loading ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400">Loading export catalog…</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {(catalog?.datasets ?? []).map((item) => (
                <div key={item.id} className="px-6 py-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-[#0d1b2e]">{item.label}</h3>
                      <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">Date: {item.dateColumn}</span>
                      {item.supportsStatusFilter && <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">Status filter</span>}
                      {item.supportsPartnerFilter && <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-semibold text-purple-700">Partner filter</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
