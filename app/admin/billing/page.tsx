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

interface BillingLeadRow {
  id: string;
  created_at: string;
  source: string | null;
  external_reference_id: string | null;
  first_name: string | null;
  last_name: string | null;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  status: string | null;
  assigned_partner_account_id: string | null;
  assigned_at: string | null;
  partner_response_status: string | null;
  partner_response_updated_at: string | null;
  billable_status: BillableStatus;
  billing_amount_cents: number | null;
  billing_notes: string | null;
  billing_reviewed_at: string | null;
  billing_updated_at: string | null;
  partner_firm_name: string | null;
}

interface PartnerRow {
  id: string;
  firm_name: string;
  status: string;
}

interface BillingEventRow {
  id: string;
  created_at: string;
  lead_id: string;
  partner_account_id: string | null;
  event_type: string;
  previous_billable_status: string | null;
  next_billable_status: string | null;
  previous_amount_cents: number | null;
  next_amount_cents: number | null;
  notes: string | null;
  created_by: string | null;
}

interface BillingSummary {
  totalTrackedLeads: number;
  reviewNeeded: number;
  billable: number;
  invoiced: number;
  waived: number;
  disputed: number;
  potentialBillableDollars: number;
  invoicedDollars: number;
  statusCounts: Record<string, number>;
  billingEventsThisMonth: number;
}

interface BillingData {
  summary: BillingSummary;
  leads: BillingLeadRow[];
  partners: PartnerRow[];
  recentEvents: BillingEventRow[];
  allowedStatuses: BillableStatus[];
}

const BILLING_STATUS_LABELS: Record<BillableStatus, string> = {
  not_reviewed: "Not Reviewed",
  review_needed: "Review Needed",
  not_billable: "Not Billable",
  billable: "Billable",
  invoiced: "Invoiced",
  waived: "Waived",
  disputed: "Disputed",
};

const BILLING_STATUS_COLORS: Record<BillableStatus, string> = {
  not_reviewed: "bg-gray-100 text-gray-700",
  review_needed: "bg-yellow-100 text-yellow-800",
  not_billable: "bg-slate-100 text-slate-700",
  billable: "bg-green-100 text-green-800",
  invoiced: "bg-blue-100 text-blue-800",
  waived: "bg-purple-100 text-purple-800",
  disputed: "bg-red-100 text-red-700",
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

function formatCurrency(centsOrDollars: number | null | undefined, alreadyDollars = false) {
  const value = centsOrDollars == null ? 0 : alreadyDollars ? centsOrDollars : centsOrDollars / 100;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

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

function leadName(lead: Pick<BillingLeadRow, "first_name" | "last_name">) {
  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
  return name || "Unnamed Lead";
}

function StatusBadge({ status }: { status: BillableStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${BILLING_STATUS_COLORS[status]}`}>
      {BILLING_STATUS_LABELS[status]}
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

function BillingReviewModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: BillingLeadRow;
  onClose: () => void;
  onSaved: (lead: BillingLeadRow) => void;
}) {
  const [status, setStatus] = useState<BillableStatus>(lead.billable_status);
  const [amount, setAmount] = useState(lead.billing_amount_cents != null ? (lead.billing_amount_cents / 100).toFixed(2) : "");
  const [notes, setNotes] = useState(lead.billing_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/admin/billing/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          billable_status: status,
          billing_amount: amount,
          billing_notes: notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save billing review.");
        return;
      }
      onSaved({ ...lead, ...data.data });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0d1b2e]">Billing Review</h2>
            <p className="mt-0.5 text-sm text-gray-500">{leadName(lead)} · {lead.partner_firm_name ?? "Unassigned"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Partner Response</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">
                {lead.partner_response_status ? PARTNER_RESPONSE_LABELS[lead.partner_response_status] ?? lead.partner_response_status : "—"}
              </p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Lead Reference</p>
              <p className="mt-1 text-sm font-semibold text-gray-800">{lead.external_reference_id ?? lead.id}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Billable Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as BillableStatus)}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              {(Object.keys(BILLING_STATUS_LABELS) as BillableStatus[]).map((option) => (
                <option key={option} value={option}>{BILLING_STATUS_LABELS[option]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Billing Amount</label>
            <div className="flex items-center rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[#1a3a5c]">
              <span className="pl-3 text-sm text-gray-400">$</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="block w-full rounded-lg border-0 px-2 py-2 text-sm text-gray-900 focus:outline-none"
              />
            </div>
            <p className="mt-1 text-xs text-gray-400">This is an internal billing-readiness amount only. No invoice or payment is created.</p>
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-gray-700">Billing Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal billing notes, waiver reason, dispute details, or invoice context…"
              className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            />
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {success && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">Billing review saved.</p>}

          <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Close
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Billing Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminBillingPage() {
  const router = useRouter();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [responseFilter, setResponseFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedLead, setSelectedLead] = useState<BillingLeadRow | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("billable_status", statusFilter);
    if (partnerFilter) params.set("partner_account_id", partnerFilter);
    if (responseFilter) params.set("partner_response_status", responseFilter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/billing?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Failed to load billing readiness data.");
        return;
      }
      setData(json.data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter, partnerFilter, responseFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const leads = data?.leads ?? [];
  const partners = data?.partners ?? [];
  const summary = data?.summary;

  const rowsByPartner = useMemo(() => {
    const counts = new Map<string, { firmName: string; billable: number; reviewNeeded: number; invoiced: number }>();
    for (const lead of leads) {
      const key = lead.assigned_partner_account_id ?? "none";
      const existing = counts.get(key) ?? {
        firmName: lead.partner_firm_name ?? "Unknown partner",
        billable: 0,
        reviewNeeded: 0,
        invoiced: 0,
      };
      if (lead.billable_status === "billable") existing.billable += 1;
      if (lead.billable_status === "review_needed") existing.reviewNeeded += 1;
      if (lead.billable_status === "invoiced") existing.invoiced += 1;
      counts.set(key, existing);
    }
    return Array.from(counts.values()).sort((a, b) => (b.billable + b.reviewNeeded) - (a.billable + a.reviewNeeded));
  }, [leads]);

  function handleSaved(updated: BillingLeadRow) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        leads: prev.leads.map((lead) => lead.id === updated.id ? { ...lead, ...updated, partner_firm_name: lead.partner_firm_name } : lead),
      };
    });
    setSelectedLead((prev) => prev ? { ...prev, ...updated, partner_firm_name: prev.partner_firm_name } : prev);
    fetchData();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/billing/invoices" className="text-gray-600 hover:text-[#0d1b2e]">Invoices</a><a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/billing" className="text-sm font-semibold text-[#1a3a5c]">Billing</a>
            <a href="/admin/billing/statements" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Statements</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Billing Readiness</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review partner-dispositioned leads for future billing. This does not create invoices, charge partners, or connect to Stripe.
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <StatCard label="Review Needed" value={summary.reviewNeeded} helper="Accepted or retained leads needing billing review" />
            <StatCard label="Billable" value={summary.billable} helper={formatCurrency(summary.potentialBillableDollars, true)} />
            <StatCard label="Invoiced" value={summary.invoiced} helper={formatCurrency(summary.invoicedDollars, true)} />
            <StatCard label="Billing Events This Month" value={summary.billingEventsThisMonth} helper="Internal audit events" />
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, state, or ref…"
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] md:col-span-2"
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]">
              <option value="">All Billing Statuses</option>
              {(Object.keys(BILLING_STATUS_LABELS) as BillableStatus[]).map((status) => (
                <option key={status} value={status}>{BILLING_STATUS_LABELS[status]}</option>
              ))}
            </select>
            <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]">
              <option value="">All Partners</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>{partner.firm_name}</option>
              ))}
            </select>
            <button onClick={fetchData} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white">
              Refresh
            </button>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <select value={responseFilter} onChange={(e) => setResponseFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]">
              <option value="">All Partner Responses</option>
              <option value="accepted">Accepted</option>
              <option value="retained">Retained</option>
              <option value="declined">Declined</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading billing readiness…</div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <p className="text-sm font-medium text-gray-600">No assigned partner leads found.</p>
              <p className="mt-1 max-w-md text-sm text-gray-400">Billing readiness appears after leads are assigned and partners update disposition.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Lead</th>
                    <th className="px-4 py-3 text-left">Partner</th>
                    <th className="px-4 py-3 text-left">Partner Response</th>
                    <th className="px-4 py-3 text-left">Billing Status</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Reviewed</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{leadName(lead)}</div>
                        <div className="text-xs text-gray-400">{lead.external_reference_id ?? lead.id}</div>
                        <div className="text-xs text-gray-400">{lead.state ?? "—"} · {lead.benefit_type ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{lead.partner_firm_name ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700">
                        {lead.partner_response_status ? PARTNER_RESPONSE_LABELS[lead.partner_response_status] ?? lead.partner_response_status : "—"}
                        <div className="text-xs text-gray-400">{formatDateTime(lead.partner_response_updated_at)}</div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={lead.billable_status} /></td>
                      <td className="px-4 py-3 font-medium text-gray-800">{lead.billing_amount_cents != null ? formatCurrency(lead.billing_amount_cents) : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(lead.billing_reviewed_at ?? lead.billing_updated_at)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedLead(lead)} className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#0d1b2e]">Partner Billing Snapshot</h2>
            <div className="mt-4 divide-y divide-gray-100">
              {rowsByPartner.length === 0 ? (
                <p className="py-4 text-sm text-gray-400">No partner billing data yet.</p>
              ) : rowsByPartner.slice(0, 8).map((row) => (
                <div key={row.firmName} className="flex items-center justify-between py-3 text-sm">
                  <span className="font-medium text-gray-800">{row.firmName}</span>
                  <span className="text-xs text-gray-500">{row.reviewNeeded} review · {row.billable} billable · {row.invoiced} invoiced</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-[#0d1b2e]">Recent Billing Events</h2>
            <div className="mt-4 divide-y divide-gray-100">
              {(data?.recentEvents ?? []).length === 0 ? (
                <p className="py-4 text-sm text-gray-400">No billing events yet.</p>
              ) : data!.recentEvents.slice(0, 8).map((event) => (
                <div key={event.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium text-gray-800">{event.event_type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-gray-400">{formatDateTime(event.created_at)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {event.previous_billable_status ?? "—"} → {event.next_billable_status ?? "—"}
                    {event.next_amount_cents != null ? ` · ${formatCurrency(event.next_amount_cents)}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {selectedLead && (
        <BillingReviewModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
