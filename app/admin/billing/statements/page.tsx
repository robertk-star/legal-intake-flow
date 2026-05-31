"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type BillableStatus =
  | "not_reviewed"
  | "review_needed"
  | "not_billable"
  | "billable"
  | "invoiced"
  | "waived"
  | "disputed";

interface PartnerRow {
  id: string;
  firm_name: string;
  status: string;
}

interface StatementLead {
  id: string;
  created_at: string;
  external_reference_id: string | null;
  claimant_name: string;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_response_updated_at: string | null;
  billable_status: BillableStatus;
  billing_amount_cents: number | null;
  billing_amount_dollars: number;
  billing_notes: string | null;
  billing_reviewed_at: string | null;
  billing_updated_at: string | null;
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

interface StatementSummary {
  partner_count: number;
  total_assigned: number;
  billable_count: number;
  billable_amount_cents: number;
  invoiced_count: number;
  invoiced_amount_cents: number;
  review_needed_count: number;
  not_reviewed_count: number;
  disputed_count: number;
  retained_count: number;
}

interface StatementData {
  period: { from: string; to: string };
  filters: { partner_id: string | null; billing_statuses: string[] };
  summary: StatementSummary;
  partners: PartnerRow[];
  statements: PartnerStatement[];
}

const STATUS_LABELS: Record<BillableStatus, string> = {
  not_reviewed: "Not Reviewed",
  review_needed: "Review Needed",
  not_billable: "Not Billable",
  billable: "Billable",
  invoiced: "Invoiced",
  waived: "Waived",
  disputed: "Disputed",
};

const STATUS_COLORS: Record<BillableStatus, string> = {
  not_reviewed: "bg-gray-100 text-gray-700",
  review_needed: "bg-yellow-100 text-yellow-800",
  not_billable: "bg-slate-100 text-slate-700",
  billable: "bg-green-100 text-green-800",
  invoiced: "bg-blue-100 text-blue-800",
  waived: "bg-purple-100 text-purple-800",
  disputed: "bg-red-100 text-red-700",
};

const DEFAULT_INCLUDED_STATUSES: BillableStatus[] = ["billable", "invoiced"];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function monthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function formatCurrency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: BillableStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
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

export default function AdminBillingStatementsPage() {
  const router = useRouter();
  const [data, setData] = useState<StatementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [partnerId, setPartnerId] = useState("");
  const [includedStatuses, setIncludedStatuses] = useState<BillableStatus[]>(DEFAULT_INCLUDED_STATUSES);
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);

  const statusParam = useMemo(() => includedStatuses.join(","), [includedStatuses]);

  const fetchStatements = useCallback(async () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (partnerId) params.set("partner_id", partnerId);
    if (statusParam) params.set("billing_statuses", statusParam);

    try {
      const res = await fetch(`/api/admin/billing/statements?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Failed to load billing statements.");
        return;
      }
      setData(payload.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [from, partnerId, router, statusParam, to]);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  function toggleStatus(status: BillableStatus) {
    setIncludedStatuses((current) => {
      if (current.includes(status)) {
        const next = current.filter((item) => item !== status);
        return next.length ? next : current;
      }
      return [...current, status];
    });
  }

  function exportUrl() {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (partnerId) params.set("partner_id", partnerId);
    if (statusParam) params.set("billing_statuses", statusParam);
    return `/api/admin/billing/statements/export?${params.toString()}`;
  }

  const summary = data?.summary;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Admin</p>
            <h1 className="text-xl font-bold text-[#0d1b2e]">Legal Intake Flow</h1>
          </div>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/billing/invoices" className="text-gray-600 hover:text-[#0d1b2e]">Invoices</a><a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/disputes" className="text-gray-600 hover:text-[#0d1b2e]">Disputes</a><a href="/admin/billing/statements" className="text-sm font-semibold text-[#1a3a5c]">Statements</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold text-[#0d1b2e]">Partner Billing Statements</h1>
            <p className="mt-1 max-w-3xl text-sm text-gray-500">
              Generate billing-period summaries and CSV exports from reviewed lead billing data. This does not send invoices or process payments.
            </p>
          </div>
          <a
            href={exportUrl()}
            className="inline-flex items-center justify-center rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0d1b2e]"
          >
            Export CSV
          </a>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">From</label>
              <input
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">To</label>
              <input
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Partner</label>
              <select
                value={partnerId}
                onChange={(event) => setPartnerId(event.target.value)}
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
              >
                <option value="">All partners</option>
                {(data?.partners ?? []).map((partner) => (
                  <option key={partner.id} value={partner.id}>{partner.firm_name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={fetchStatements}
                disabled={loading}
                className="w-full rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white disabled:opacity-50"
              >
                {loading ? "Loading…" : "Refresh"}
              </button>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Included Billing Statuses</p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(STATUS_LABELS) as BillableStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleStatus(status)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    includedStatuses.includes(status)
                      ? "border-[#1a3a5c] bg-[#1a3a5c] text-white"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Partners Included" value={summary.partner_count} helper={`${summary.total_assigned} assigned leads`} />
            <StatCard label="Billable Value" value={formatCurrency(summary.billable_amount_cents)} helper={`${summary.billable_count} billable leads`} />
            <StatCard label="Invoiced Value" value={formatCurrency(summary.invoiced_amount_cents)} helper={`${summary.invoiced_count} invoiced leads`} />
            <StatCard label="Needs Billing Review" value={summary.review_needed_count + summary.not_reviewed_count} helper={`${summary.disputed_count} disputed`} />
          </div>
        )}

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center text-sm text-gray-400 shadow-sm">
              Loading partner statements…
            </div>
          ) : !data || data.statements.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
              <p className="text-sm font-semibold text-gray-700">No statement rows found.</p>
              <p className="mt-1 text-sm text-gray-400">
                Adjust the date range, partner filter, or included billing statuses.
              </p>
            </div>
          ) : (
            data.statements.map((statement) => {
              const expanded = expandedPartner === statement.partner_account_id;
              return (
                <div key={statement.partner_account_id} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
                  <button
                    type="button"
                    onClick={() => setExpandedPartner(expanded ? null : statement.partner_account_id)}
                    className="flex w-full flex-col gap-4 px-5 py-4 text-left transition hover:bg-gray-50 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div>
                      <h2 className="text-lg font-bold text-[#0d1b2e]">{statement.firm_name}</h2>
                      <p className="mt-1 text-xs text-gray-500">
                        {statement.total_assigned} lead{statement.total_assigned !== 1 ? "s" : ""} · {statement.retained_count} retained · {statement.declined_count} declined
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Billable</p>
                        <p className="font-semibold text-gray-800">{statement.billable_count} / {formatCurrency(statement.billable_amount_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Invoiced</p>
                        <p className="font-semibold text-gray-800">{statement.invoiced_count} / {formatCurrency(statement.invoiced_amount_cents)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Review</p>
                        <p className="font-semibold text-gray-800">{statement.review_needed_count + statement.not_reviewed_count}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wider text-gray-400">Issues</p>
                        <p className="font-semibold text-gray-800">{statement.disputed_count} disputed</p>
                      </div>
                    </div>
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-100">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="px-4 py-3 text-left">Assigned</th>
                              <th className="px-4 py-3 text-left">Claimant</th>
                              <th className="px-4 py-3 text-left">State</th>
                              <th className="px-4 py-3 text-left">Benefit</th>
                              <th className="px-4 py-3 text-left">Partner Response</th>
                              <th className="px-4 py-3 text-left">Billing Status</th>
                              <th className="px-4 py-3 text-right">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {statement.leads.map((lead) => (
                              <tr key={lead.id} className="hover:bg-gray-50">
                                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDate(lead.assigned_at)}</td>
                                <td className="px-4 py-3">
                                  <div className="font-medium text-gray-900">{lead.claimant_name}</div>
                                  <div className="text-xs text-gray-400">{lead.external_reference_id ?? lead.id}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-600">{lead.state ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-600">{lead.benefit_type ?? "—"}</td>
                                <td className="px-4 py-3 text-gray-600">{lead.partner_response_status?.replace(/_/g, " ") ?? "—"}</td>
                                <td className="px-4 py-3"><StatusBadge status={lead.billable_status} /></td>
                                <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatCurrency(lead.billing_amount_cents)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
