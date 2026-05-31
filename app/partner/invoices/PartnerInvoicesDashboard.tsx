"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceStatus = "sent" | "partially_paid" | "paid" | "draft" | "void";

interface InvoiceRow {
  id: string;
  created_at: string;
  invoice_number: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  total_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  draft: "Draft",
  void: "Void",
};

const STATUS_COLORS: Record<string, string> = {
  sent: "bg-blue-100 text-blue-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  draft: "bg-gray-100 text-gray-700",
  void: "bg-red-100 text-red-700",
};

function currency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status] ?? STATUS_COLORS.sent}`}>{STATUS_LABELS[status] ?? status}</span>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p><p className="mt-2 text-3xl font-bold text-[#0d1b2e]">{value}</p></div>;
}

export default function PartnerInvoicesDashboard() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/partner/invoices");
    if (res.status === 401) {
      router.push("/partner/login");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load invoices.");
      setLoading(false);
      return;
    }
    setInvoices(data.data.invoices ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => invoices.reduce((acc, invoice) => {
    acc.total += invoice.total_cents ?? 0;
    acc.balance += invoice.balance_due_cents ?? 0;
    if (invoice.status === "paid") acc.paid += 1;
    return acc;
  }, { total: 0, balance: 0, paid: 0 }), [invoices]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
        This page shows invoice records for review only. Online payment processing is not enabled in Legal Intake Flow yet.
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatCard label="Invoices" value={invoices.length} />
        <StatCard label="Paid" value={summary.paid} />
        <StatCard label="Total" value={currency(summary.total)} />
        <StatCard label="Balance Due" value={currency(summary.balance)} />
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><button onClick={load} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Refresh</button></div>
      {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? <p className="py-12 text-center text-sm text-gray-400">Loading invoices…</p> : invoices.length === 0 ? <div className="py-14 text-center"><p className="text-sm font-medium text-gray-600">No invoices available.</p><p className="mt-1 text-sm text-gray-400">Sent or paid invoice records will appear here.</p></div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Paid</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Export</th></tr></thead><tbody className="divide-y divide-gray-100">{invoices.map((invoice) => <tr key={invoice.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-semibold text-[#0d1b2e]">{invoice.invoice_number}<div className="text-xs font-normal text-gray-400">Created {formatDate(invoice.created_at)}</div></td><td className="px-4 py-3 text-gray-600">{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</td><td className="px-4 py-3"><StatusBadge status={invoice.status} /></td><td className="px-4 py-3 text-right font-semibold">{currency(invoice.total_cents)}</td><td className="px-4 py-3 text-right">{currency(invoice.amount_paid_cents)}</td><td className="px-4 py-3 text-right font-semibold">{currency(invoice.balance_due_cents)}</td><td className="px-4 py-3"><a href={`/api/partner/invoices/${invoice.id}/export`} className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">CSV</a></td></tr>)}</tbody></table></div>
        )}
      </div>
    </div>
  );
}
