"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type InvoiceStatus = "draft" | "sent" | "partially_paid" | "paid" | "void";

interface PartnerRow {
  id: string;
  firm_name: string;
  status: string;
}

interface InvoiceRow {
  id: string;
  created_at: string;
  updated_at: string;
  partner_account_id: string;
  partner_firm_name: string;
  invoice_number: string;
  status: InvoiceStatus;
  period_start: string;
  period_end: string;
  subtotal_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  notes: string | null;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  invoice_email_sent_at: string | null;
  invoice_email_count: number | null;
  due_date: string | null;
  reminder_sent_at: string | null;
  reminder_count: number | null;
  overdue_marked_at: string | null;
}

interface InvoiceDetail extends InvoiceRow {
  partner: { id: string; firm_name: string; email: string | null; status: string } | null;
  items: Array<{ id: string; lead_id: string; description: string; amount_cents: number; billing_status_at_creation: string | null }>;
  events: Array<{ id: string; created_at: string; event_type: string; previous_status: string | null; next_status: string | null; amount_cents: number | null; notes: string | null; created_by: string | null }>;
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  partially_paid: "Partially Paid",
  paid: "Paid",
  void: "Void",
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-800",
  partially_paid: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  void: "bg-red-100 text-red-700",
};

function monthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

function today(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function currency(cents: number | null | undefined) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format((cents ?? 0) / 100);
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>{STATUS_LABELS[status]}</span>;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#0d1b2e]">{value}</p>
    </div>
  );
}

function CreateInvoiceModal({ partners, onClose, onCreated }: { partners: PartnerRow[]; onClose: () => void; onCreated: () => void }) {
  const [partnerId, setPartnerId] = useState("");
  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(today());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createInvoice() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partner_account_id: partnerId, period_start: from, period_end: to, notes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to create invoice draft.");
        return;
      }
      onCreated();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0d1b2e]">Create Invoice Draft</h2>
            <p className="text-sm text-gray-500">Creates a draft from billable leads for the selected partner and period.</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Partner</label>
            <select value={partnerId} onChange={(e) => setPartnerId(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
              <option value="">Select partner</option>
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.firm_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Period Start</label>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Period End</label>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-500">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Optional internal invoice notes…" />
          </div>
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700">Cancel</button>
            <button onClick={createInvoice} disabled={saving || !partnerId} className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Creating…" : "Create Draft"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function InvoiceDetailModal({ invoiceId, onClose, onUpdated }: { invoiceId: string; onClose: () => void; onUpdated: () => void }) {
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [amountPaid, setAmountPaid] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [reminderSending, setReminderSending] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/billing/invoices/${invoiceId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load invoice.");
      setLoading(false);
      return;
    }
    const loaded = data.data as InvoiceDetail;
    setInvoice(loaded);
    setStatus(loaded.status);
    setAmountPaid((loaded.amount_paid_cents / 100).toFixed(2));
    setNotes(loaded.notes ?? "");
    setDueDate(loaded.due_date ?? "");
    setLoading(false);
  }, [invoiceId]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, amount_paid: amountPaid, notes, due_date: dueDate || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save invoice.");
        return;
      }
      setInvoice(data.data);
      setSuccess(true);
      onUpdated();
      setTimeout(() => setSuccess(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function sendInvoiceEmail() {
    if (!invoice) return;
    setEmailSending(true);
    setEmailError(null);
    setEmailMessage(null);
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoice.id}/send-email`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEmailError(data.error ?? "Failed to send invoice email.");
        return;
      }
      const sent = data.data?.sent ?? 0;
      const skipped = data.data?.skipped ?? 0;
      const failed = data.data?.failed ?? 0;
      setEmailMessage(`Invoice email sent to ${sent} recipient${sent === 1 ? "" : "s"}. Skipped: ${skipped}. Failed: ${failed}.`);
      await load();
      onUpdated();
    } catch {
      setEmailError("Network error while sending invoice email.");
    } finally {
      setEmailSending(false);
    }
  }


  async function sendInvoiceReminder() {
    if (!invoice) return;
    setReminderSending(true);
    setReminderError(null);
    setReminderMessage(null);
    try {
      const res = await fetch(`/api/admin/billing/invoices/${invoice.id}/send-reminder`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReminderError(data.error ?? "Failed to send invoice reminder.");
        return;
      }
      const sent = data.data?.sent ?? 0;
      const skipped = data.data?.skipped ?? 0;
      const failed = data.data?.failed ?? 0;
      setReminderMessage(`Invoice reminder sent to ${sent} recipient${sent === 1 ? "" : "s"}. Skipped: ${skipped}. Failed: ${failed}.`);
      await load();
      onUpdated();
    } catch {
      setReminderError("Network error while sending invoice reminder.");
    } finally {
      setReminderSending(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0d1b2e]">Invoice Detail</h2>
            <p className="text-sm text-gray-500">{invoice?.invoice_number ?? "Loading…"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">✕</button>
        </div>
        <div className="max-h-[75vh] space-y-6 overflow-y-auto px-6 py-5">
          {loading && <p className="py-10 text-center text-sm text-gray-400">Loading invoice…</p>}
          {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          {invoice && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-6">
                <StatCard label="Total" value={currency(invoice.total_cents)} />
                <StatCard label="Paid" value={currency(invoice.amount_paid_cents)} />
                <StatCard label="Balance" value={currency(invoice.balance_due_cents)} />
                <StatCard label="Email Count" value={invoice.invoice_email_count ?? 0} />
                <StatCard label="Reminders" value={invoice.reminder_count ?? 0} />
                <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Status</p><div className="mt-3"><StatusBadge status={invoice.status} /></div></div>
              </div>

              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Updates</h3>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <select value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm">
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                  <input value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Amount paid" />
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm" title="Invoice due date" />
                  <a href={`/api/admin/billing/invoices/${invoice.id}/export`} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-center text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Export CSV</a>
                </div>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Invoice notes…" />
                {success && <p className="mt-2 text-xs text-green-600">Invoice saved.</p>}
                <button onClick={save} disabled={saving} className="mt-3 rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving…" : "Save Invoice"}</button>
              </section>

              <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-blue-700">Invoice Email</h3>
                    <p className="mt-1 text-sm text-blue-800">
                      Email this invoice notice to active owner/admin users on the partner account. Last sent: {formatDateTime(invoice.invoice_email_sent_at)}.
                    </p>
                  </div>
                  <button
                    onClick={sendInvoiceEmail}
                    disabled={emailSending || invoice.status === "void"}
                    className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {emailSending ? "Sending…" : "Send Invoice Email"}
                  </button>
                </div>
                {emailMessage && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{emailMessage}</p>}
                {emailError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{emailError}</p>}
              </section>

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700">Invoice Reminder</h3>
                    <p className="mt-1 text-sm text-amber-800">
                      Due date: {formatDate(invoice.due_date)}. Last reminder: {formatDateTime(invoice.reminder_sent_at)}.
                    </p>
                    {invoice.due_date && invoice.balance_due_cents > 0 && ["sent", "partially_paid"].includes(invoice.status) && invoice.due_date < new Date().toISOString().slice(0, 10) && (
                      <p className="mt-1 text-xs font-semibold text-red-700">This invoice is overdue.</p>
                    )}
                  </div>
                  <button
                    onClick={sendInvoiceReminder}
                    disabled={reminderSending || invoice.status === "void" || invoice.status === "paid" || invoice.balance_due_cents <= 0}
                    className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {reminderSending ? "Sending…" : "Send Reminder"}
                  </button>
                </div>
                {reminderMessage && <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{reminderMessage}</p>}
                {reminderError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{reminderError}</p>}
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Invoice Items</h3>
                <div className="overflow-hidden rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 text-left">Description</th><th className="px-4 py-3 text-left">Lead ID</th><th className="px-4 py-3 text-right">Amount</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoice.items.map((item) => <tr key={item.id}><td className="px-4 py-3 text-gray-800">{item.description}</td><td className="px-4 py-3 text-xs text-gray-500">{item.lead_id}</td><td className="px-4 py-3 text-right font-semibold">{currency(item.amount_cents)}</td></tr>)}
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Invoice Events</h3>
                <div className="space-y-2">
                  {invoice.events.map((event) => <div key={event.id} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm"><div className="font-semibold text-gray-800">{event.event_type.replace(/_/g, " ")}</div><div className="text-xs text-gray-500">{formatDateTime(event.created_at)} · {event.previous_status ?? "—"} → {event.next_status ?? "—"}</div>{event.notes && <p className="mt-1 text-gray-600">{event.notes}</p>}</div>)}
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [partners, setPartners] = useState<PartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerFilter, setPartnerFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (partnerFilter) params.set("partner_id", partnerFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/billing/invoices?${params.toString()}`);
    if (res.status === 401) {
      router.push("/admin/login");
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Failed to load invoices.");
      setLoading(false);
      return;
    }
    setInvoices(data.data.invoices ?? []);
    setPartners(data.data.partners ?? []);
    setLoading(false);
  }, [partnerFilter, router, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => {
    return invoices.reduce((acc, inv) => {
      acc.total += 1;
      acc.balance += inv.balance_due_cents ?? 0;
      acc.totalCents += inv.total_cents ?? 0;
      if (inv.status === "draft") acc.draft += 1;
      if (inv.status === "paid") acc.paid += 1;
      if (inv.due_date && inv.balance_due_cents > 0 && ["sent", "partially_paid"].includes(inv.status) && inv.due_date < new Date().toISOString().slice(0, 10)) acc.overdue += 1;
      return acc;
    }, { total: 0, draft: 0, paid: 0, overdue: 0, totalCents: 0, balance: 0 });
  }, [invoices]);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div><h1 className="text-xl font-bold text-[#0d1b2e]">Invoice Drafts</h1><p className="text-sm text-gray-500">Internal invoice tracking only. No payments or Stripe.</p></div>
          <nav className="flex flex-wrap gap-3 text-sm"><a href="/admin/billing" className="text-gray-600 hover:text-[#0d1b2e]">Billing</a><a href="/admin/billing/disputes" className="text-gray-600 hover:text-[#0d1b2e]">Disputes</a><a href="/admin/billing/statements" className="text-gray-600 hover:text-[#0d1b2e]">Statements</a><a href="/admin/reports" className="text-gray-600 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a></nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4"><StatCard label="Invoices" value={summary.total} /><StatCard label="Drafts" value={summary.draft} /><StatCard label="Overdue" value={summary.overdue} /><StatCard label="Total" value={currency(summary.totalCents)} /><StatCard label="Balance Due" value={currency(summary.balance)} /></div>
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <select value={partnerFilter} onChange={(e) => setPartnerFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">All Partners</option>{partners.map((p) => <option key={p.id} value={p.id}>{p.firm_name}</option>)}</select>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="">All Statuses</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
            <button onClick={load} className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Refresh</button>
            <button onClick={() => setShowCreate(true)} className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e]">Create Draft</button>
          </div>
        </div>
        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {loading ? <p className="py-12 text-center text-sm text-gray-400">Loading invoices…</p> : invoices.length === 0 ? <p className="py-12 text-center text-sm text-gray-500">No invoices found.</p> : (
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-4 py-3 text-left">Invoice</th><th className="px-4 py-3 text-left">Partner</th><th className="px-4 py-3 text-left">Period</th><th className="px-4 py-3 text-left">Due</th><th className="px-4 py-3 text-left">Status</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3 text-right">Balance</th><th className="px-4 py-3 text-left">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{invoices.map((invoice) => <tr key={invoice.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-semibold text-[#0d1b2e]">{invoice.invoice_number}<div className="text-xs font-normal text-gray-400">{formatDate(invoice.created_at)}</div></td><td className="px-4 py-3 text-gray-700">{invoice.partner_firm_name}</td><td className="px-4 py-3 text-gray-600">{formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}</td><td className="px-4 py-3 text-gray-600">{formatDate(invoice.due_date)}{invoice.reminder_count ? <div className="text-xs text-gray-400">{invoice.reminder_count} reminder{invoice.reminder_count === 1 ? "" : "s"}</div> : null}</td><td className="px-4 py-3"><StatusBadge status={invoice.status} /></td><td className="px-4 py-3 text-right font-semibold">{currency(invoice.total_cents)}</td><td className="px-4 py-3 text-right font-semibold">{currency(invoice.balance_due_cents)}</td><td className="px-4 py-3"><button onClick={() => setSelectedInvoiceId(invoice.id)} className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">View</button></td></tr>)}</tbody></table></div>
          )}
        </div>
      </main>
      {showCreate && <CreateInvoiceModal partners={partners} onClose={() => setShowCreate(false)} onCreated={load} />}
      {selectedInvoiceId && <InvoiceDetailModal invoiceId={selectedInvoiceId} onClose={() => setSelectedInvoiceId(null)} onUpdated={load} />}
    </div>
  );
}
