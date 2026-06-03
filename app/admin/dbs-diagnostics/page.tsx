"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DbsIngestEvent = {
  id: string;
  created_at: string;
  external_reference_id: string | null;
  dbs_report_number: string | null;
  lif_lead_id: string | null;
  ingest_result: string;
  status_code: number | null;
  error_message: string | null;
  consent_given: boolean | null;
  consent_source: string | null;
  consent_timestamp: string | null;
  received_at: string | null;
  duplicate: boolean | null;
  auto_assignment_enabled: boolean | null;
  auto_assign_new_dbs_leads: boolean | null;
  assigned_partner_account_id: string | null;
  response_summary: Record<string, unknown> | null;
};

type DbsLead = {
  id: string;
  created_at: string;
  updated_at: string | null;
  source: string | null;
  external_reference_id: string | null;
  dbs_report_number: string | null;
  dbs_consent_given: boolean | null;
  dbs_consent_source: string | null;
  dbs_consent_timestamp: string | null;
  dbs_received_at: string | null;
  status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
};

type DiagnosticsData = {
  generatedAt: string;
  warnings: string[];
  configuration: {
    endpoint: string;
    lifDbsIngestSecretConfigured: boolean;
    lifAppUrlConfigured: boolean;
    autoAssignmentEnabled: boolean;
    autoAssignNewDbsLeads: boolean;
    notifyPartnerOnAutoAssignment: boolean;
    minimumRoutingScore: number;
    requireZeroBlockers: boolean;
  };
  summary: {
    recentEvents: number;
    recentDbsLeads: number;
    createdEvents: number;
    duplicateEvents: number;
    rejectedEvents: number;
    failedEvents: number;
    assignedLeads: number;
    unassignedLeads: number;
    consentedLeads: number;
  };
  counts: {
    ingestResults: Record<string, number>;
    leadStatuses: Record<string, number>;
  };
  events: DbsIngestEvent[];
  leads: DbsLead[];
};

const RESULT_STYLES: Record<string, string> = {
  created: "bg-green-100 text-green-800",
  duplicate: "bg-blue-100 text-blue-800",
  rejected: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  received: "bg-gray-100 text-gray-700",
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

function StatusPill({ ok, yes = "Configured", no = "Missing" }: { ok: boolean; yes?: string; no?: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
      {ok ? yes : no}
    </span>
  );
}

function ResultPill({ result }: { result: string }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${RESULT_STYLES[result] ?? "bg-gray-100 text-gray-700"}`}>
      {result.replace(/_/g, " ")}
    </span>
  );
}

function StatCard({ label, value, helper }: { label: string; value: number | string; helper?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#0d1b2e]">{value}</p>
      {helper && <p className="mt-1 text-xs text-gray-500">{helper}</p>}
    </div>
  );
}

function AdminNav() {
  return (
    <nav className="flex flex-wrap items-center gap-4">
      <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
      <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
      <a href="/admin/dbs-diagnostics" className="text-sm font-semibold text-[#1a3a5c]">DBS Diagnostics</a>
      <a href="/admin/routing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Routing</a>
      <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
      <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
      <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
    </nav>
  );
}

export default function DbsDiagnosticsPage() {
  const router = useRouter();
  const [data, setData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [resultFilter, setResultFilter] = useState("all");

  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (resultFilter !== "all") params.set("result", resultFilter);

    try {
      const res = await fetch(`/api/admin/dbs-diagnostics?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Failed to load DBS diagnostics.");
        return;
      }
      setData(payload as DiagnosticsData);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, search, resultFilter]);

  useEffect(() => {
    fetchDiagnostics();
  }, [fetchDiagnostics]);

  const recentProblemCount = useMemo(() => {
    if (!data) return 0;
    return data.summary.rejectedEvents + data.summary.failedEvents;
  }, [data]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-xl font-bold text-[#0d1b2e]">DBS / LIF Diagnostics</h1>
              <p className="mt-1 text-sm text-gray-500">Handoff receipt audit, duplicate visibility, and assignment configuration.</p>
            </div>
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {data?.warnings && data.warnings.length > 0 && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
            <p className="font-semibold">Diagnostics loaded with warnings.</p>
            <ul className="mt-2 list-disc pl-5">
              {data.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">Loading DBS diagnostics…</div>
        ) : data ? (
          <>
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <StatCard label="Recent Events" value={data.summary.recentEvents} helper="DBS ingest attempts logged" />
              <StatCard label="DBS Leads" value={data.summary.recentDbsLeads} helper="Active LIF lead records" />
              <StatCard label="Created" value={data.summary.createdEvents} helper="Accepted as new" />
              <StatCard label="Duplicates" value={data.summary.duplicateEvents} helper="Existing LIF lead returned" />
              <StatCard label="Problems" value={recentProblemCount} helper="Rejected or failed" />
              <StatCard label="Unassigned" value={data.summary.unassignedLeads} helper="Need admin review" />
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#0d1b2e]">Configuration Snapshot</h2>
                  <p className="mt-1 text-sm text-gray-500">Secret values are never displayed.</p>
                </div>
                <button onClick={fetchDiagnostics} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Refresh</button>
              </div>
              <dl className="mt-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-400">Ingest Endpoint</dt><dd className="mt-1 font-mono text-xs text-gray-700">{data.configuration.endpoint}</dd></div>
                <div className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-400">LIF_DBS_INGEST_SECRET</dt><dd className="mt-1"><StatusPill ok={data.configuration.lifDbsIngestSecretConfigured} /></dd></div>
                <div className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-400">Auto Assignment</dt><dd className="mt-1"><StatusPill ok={data.configuration.autoAssignmentEnabled} yes="Enabled" no="Off" /></dd></div>
                <div className="rounded-lg bg-gray-50 p-3"><dt className="text-xs font-semibold uppercase text-gray-400">Auto-Assign DBS Leads</dt><dd className="mt-1"><StatusPill ok={data.configuration.autoAssignNewDbsLeads} yes="Enabled" no="Off" /></dd></div>
              </dl>
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search DBS ref or report number…" className="rounded-lg border border-gray-300 px-3 py-2 text-sm sm:col-span-2" />
                <select value={resultFilter} onChange={(e) => setResultFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                  <option value="all">All results</option>
                  <option value="created">Created</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="rejected">Rejected</option>
                  <option value="failed">Failed</option>
                </select>
                <button onClick={fetchDiagnostics} className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e]">Apply</button>
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Recent DBS Ingest Events</h2>
              </div>
              {data.events.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No ingest events found. Run the Phase 51 SQL migration if this should be populated.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Time</th>
                        <th className="px-4 py-3 text-left">Result</th>
                        <th className="px-4 py-3 text-left">DBS Ref</th>
                        <th className="px-4 py-3 text-left">Report</th>
                        <th className="px-4 py-3 text-left">Consent</th>
                        <th className="px-4 py-3 text-left">LIF Lead</th>
                        <th className="px-4 py-3 text-left">Assignment</th>
                        <th className="px-4 py-3 text-left">Error / Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.events.map((event) => (
                        <tr key={event.id} className="align-top hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDateTime(event.created_at)}</td>
                          <td className="px-4 py-3"><ResultPill result={event.ingest_result} /></td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{event.external_reference_id ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{event.dbs_report_number ?? "—"}</td>
                          <td className="px-4 py-3"><StatusPill ok={event.consent_given === true} yes="Yes" no="No" /></td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{event.lif_lead_id ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-600">{event.assigned_partner_account_id ? "Assigned" : "Unassigned"}</td>
                          <td className="max-w-xs px-4 py-3 text-xs text-gray-600">
                            {event.error_message ? <span className="text-red-600">{event.error_message}</span> : event.duplicate ? "Duplicate accepted" : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-100 px-5 py-4">
                <h2 className="text-base font-semibold text-[#0d1b2e]">Recent DBS Leads in LIF</h2>
              </div>
              {data.leads.length === 0 ? (
                <div className="py-12 text-center text-sm text-gray-400">No active DBS leads found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3 text-left">Received</th>
                        <th className="px-4 py-3 text-left">Lead Status</th>
                        <th className="px-4 py-3 text-left">DBS Ref</th>
                        <th className="px-4 py-3 text-left">Report</th>
                        <th className="px-4 py-3 text-left">Consent</th>
                        <th className="px-4 py-3 text-left">Assignment</th>
                        <th className="px-4 py-3 text-left">Partner Response</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.leads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-gray-50">
                          <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">{formatDateTime(lead.dbs_received_at ?? lead.created_at)}</td>
                          <td className="px-4 py-3 capitalize text-gray-700">{lead.status?.replace(/_/g, " ") ?? "—"}</td>
                          <td className="px-4 py-3 font-mono text-xs text-gray-600">{lead.external_reference_id ?? "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{lead.dbs_report_number ?? "—"}</td>
                          <td className="px-4 py-3"><StatusPill ok={lead.dbs_consent_given === true} yes="Yes" no="No" /></td>
                          <td className="px-4 py-3 text-xs text-gray-600">{lead.assigned_partner_account_id ? `Assigned ${formatDateTime(lead.assigned_at)}` : "Unassigned"}</td>
                          <td className="px-4 py-3 capitalize text-gray-700">{lead.partner_response_status?.replace(/_/g, " ") ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </div>
  );
}
