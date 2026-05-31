"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type DisputeStatus = "open" | "in_review" | "resolved" | "declined";

interface PartnerRow { id: string; firm_name: string; email: string | null; status: string; }
interface InvoiceSummary { id: string; invoice_number: string; total_cents: number; balance_due_cents: number; status: string; }
interface DisputeRow {
  id: string;
  created_at: string;
  updated_at: string;
  partner_account_id: string;
  partner_user_id: string | null;
  invoice_id: string;
  invoice_item_id: string | null;
  lead_id: string | null;
  reason: string;
  details: string | null;
  status: DisputeStatus;
  admin_resolution_notes: string | null;
  resolved_at: string | null;
  partner: PartnerRow | null;
  invoice: InvoiceSummary | null;
}

const STATUS_LABELS: Record<DisputeStatus, string> = {
  open: "Open",
  in_review: "In Review",
  resolved: "Resolved",
  declined: "Declined",
};

const STATUS_COLORS: Record<DisputeStatus, string> = {
  open: "bg-red-100 text-red-700",
  in_review: "bg-yellow-100 text-yellow-800",
  resolved: "bg-green-100 text-green-800",
  declined: "bg-gray-100 text-gray-700",
};

const REASON_LABELS: Record<string, string> = {
  question: "General Question",
  duplicate: "Duplicate Lead",
  wrong_amount: "Wrong Amount",
  not_billable: "Not Billable",
  lead_quality: "Lead Quality Issue",
  other: "Other",
};

function currency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function Badge({ status }: { status: DisputeStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}

function StatCard({ label, value }: { label: string | number; value: string | number }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-2 text-3xl font-bold text-[#0d1b2e]">{value}</p></div>;
}

function DisputeDetailModal({ dispute, onClose, onUpdated }: { dispute: DisputeRow; onClose: () => void; onUpdated: () => void }) {
  const [status, setStatus] = useState<DisputeStatus>(dispute.status);
  const [notes, setNotes] = useState(dispute.admin_resolution_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/billing/disputes/${dispute.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, admin_resolution_notes: notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update dispute.");
        return;
      }
      setSuccess(true);
      onUpdated();
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div><h2 className="text-lg font-bold text-[#0d1b2e]">Billing Review Request</h2><p className="text-sm text-gray-500">{dispute.invoice?.invoice_number ?? dispute.invoice_id}</p></div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Partner" value={dispute.partner?.firm_name ?? "Unknown"} />
            <StatCard label="Invoice Balance" value={currency(dispute.invoice?.balance_due_cents)} />
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</p><div className="mt-3"><Badge status={dispute.status} /></div></div>
          </div>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Partner Request</h3>
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="font-semibold text-[#0d1b2e]">{REASON_LABELS[dispute.reason] ?? dispute.reason}</p>
              <p className="mt-2 whitespace-pre-wrap text-gray-700">{dispute.details || "No details provided."}</p>
              <p className="mt-2 text-xs text-gray-400">Submitted {formatDateTime(dispute.created_at)}</p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Resolution</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select value={status} onChange={(e) => setStatus(e.target.value as DisputeStatus)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
              <a href={`/admin/billing/invoices`} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-center text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Open Invoices</a>
            </div>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Write resolution notes visible to the partner…" />
            {error && <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {success && <p className="mt-2 text-xs text-green-600">Dispute updated.</p>}
            <button onClick={save} disabled={saving} className="mt-3 rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Resolution"}</button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AdminBillingDisputesPage() {
  const router = useRouter();
  const [disputes, setDisputes] = useState<DisputeRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [partnerFilter, setPartnerFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<DisputeRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (partnerFilter) params.set("partner_id", partnerFilter);
    const res = await fetch(`/api/admin/billing/disputes?${params.toString()}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load disputes.");
      setLoading(false);
      return;
    }
    setDisputes(data.data.disputes ?? []);
    setPartners(data.data.partners ?? []);
    setLoading(false);
  }, [partnerFilter, router, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => disputes.reduce((acc, dispute) => {
    acc.total += 1;
    if (dispute.status === "open") acc.open += 1;
    if (dispute.status === "in_review") acc.inReview += 1;
    if (dispute.status === "resolved") acc.resolved += 1;
    return acc;
  }, { total: 0, open: 0, inReview: 0, resolved: 0 }), [disputes]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div><h1 className="text-xl font-bold text-[#0d1b2e]">Invoice Disputes</h1><p className="text-sm text-gray-500">Partner billing questions and dispute resolution. No automatic credits or payments.</p></div>
          <nav className="flex flex-wrap gap-3 text-sm"><a href="/admin/billing" className="text-gray-600 hover:text-[#0d1b2e]">Billing</a><a href="/admin/billing/invoices" className="text-gray-600 hover:text-[#0d1b2e]">Invoices</a><a href="/admin/billing/statements" className="text-gray-600 hover:text-[#0d1b2e]">Statements</a><a href="/admin/billing/disputes" className="font-semibold text-[#1a3a5c]">Disputes</a><a href="/admin/reports" className="text-gray-600 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a></nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4"><StatCard label="Disputes" value={summary.total} /><StatCard label="Open" value={summary.open} /><StatCard label="In Review" value={summary.inReview} /><StatCard label="Resolved" value={summary.resolved} /></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><div className="grid grid-cols-1 gap-3 sm:grid-cols-4"><select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">All Partners</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.firm_name}</option>)}</select><select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">All Statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><button onClick={load} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Refresh</button></div></div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? <p className="py-12 text-center text-sm text-gray-400">Loading disputes…</p> : disputes.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">No invoice disputes found.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 text-left">Submitted</th><th className="px-4 py-3 text-left">Partner</th><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Reason</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-left">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{disputes.map((dispute) => <tr key={dispute.id} className="hover:bg-gray-50"><td className="px-4 py-3 text-xs text-gray-500">{formatDateTime(dispute.created_at)}</td><td className="px-4 py-3 font-medium text-gray-800">{dispute.partner?.firm_name ?? "Unknown"}</td><td className="px-4 py-3 text-gray-600">{dispute.invoice?.invoice_number ?? dispute.invoice_id}<div className="text-xs text-gray-400">Balance {currency(dispute.invoice?.balance_due_cents)}</div></td><td className="px-4 py-3 text-gray-600">{REASON_LABELS[dispute.reason] ?? dispute.reason}<div className="max-w-xs truncate text-xs text-gray-400">{dispute.details}</div></td><td className="px-4 py-3"><Badge status={dispute.status} /></td><td className="px-4 py-3"><button onClick={() => setSelected(dispute)} className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Review</button></td></tr>)}</tbody></table></div>
          )}
        </div>
      </main>
      {selected && <DisputeDetailModal dispute={selected} onClose={() => setSelected(null)} onUpdated={load} />}
    </div>
  );
}
