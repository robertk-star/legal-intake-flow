"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type NotificationStatus = "queued" | "sent" | "failed" | "skipped";
type NotificationType = "partner_login_link" | "lead_assigned" | "invoice_sent" | "invoice_reminder";

interface EmailNotificationRow {
  id: string;
  created_at: string;
  notification_type: NotificationType;
  recipient_email: string;
  recipient_name: string | null;
  subject: string;
  status: NotificationStatus;
  provider: string | null;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  lead_id: string | null;
  partner_account_id: string | null;
  partner_user_id: string | null;
  login_request_id: string | null;
  invoice_id: string | null;
}

const STATUS_LABELS: Record<NotificationStatus, string> = {
  queued: "Queued",
  sent: "Sent",
  failed: "Failed",
  skipped: "Skipped",
};

const STATUS_COLORS: Record<NotificationStatus, string> = {
  queued: "bg-blue-100 text-blue-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-700",
  skipped: "bg-yellow-100 text-yellow-800",
};

const TYPE_LABELS: Record<NotificationType, string> = {
  partner_login_link: "Partner Login Link",
  lead_assigned: "Lead Assigned",
  invoice_sent: "Invoice Sent",
  invoice_reminder: "Invoice Reminder",
};

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: NotificationStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

export default function AdminNotificationsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmailNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const fetchRows = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);

    try {
      const res = await fetch(`/api/admin/notifications?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to load notifications.");
        return;
      }
      setRows(data.data ?? []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router, statusFilter, typeFilter]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/notifications" className="text-sm font-semibold text-[#1a3a5c]">Notifications</a>
            <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
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
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Email Notifications</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review delivery status for partner login links and lead assignment notifications.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              <option value="">All Notification Types</option>
              <option value="partner_login_link">Partner Login Link</option>
              <option value="lead_assigned">Lead Assigned</option>
              <option value="invoice_sent">Invoice Sent</option>
              <option value="invoice_reminder">Invoice Reminder</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              <option value="">All Statuses</option>
              <option value="queued">Queued</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
              <option value="skipped">Skipped</option>
            </select>
            <button
              onClick={fetchRows}
              className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          {error && (
            <div className="border-b border-red-100 bg-red-50 px-6 py-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading notifications…
            </div>
          ) : rows.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              No notification records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Type</th>
                    <th className="px-4 py-3 text-left">Recipient</th>
                    <th className="px-4 py-3 text-left">Subject</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Sent</th>
                    <th className="px-4 py-3 text-left">Related</th>
                    <th className="px-4 py-3 text-left">Error</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(row.created_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {TYPE_LABELS[row.notification_type] ?? row.notification_type}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.recipient_name ?? "—"}</div>
                        <div className="text-xs text-gray-500">{row.recipient_email}</div>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-gray-700">
                        <span className="line-clamp-2">{row.subject}</span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                        {formatDateTime(row.sent_at)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {row.lead_id && <div>Lead: {row.lead_id.slice(0, 8)}…</div>}
                        {row.partner_account_id && <div>Account: {row.partner_account_id.slice(0, 8)}…</div>}
                        {row.partner_user_id && <div>User: {row.partner_user_id.slice(0, 8)}…</div>}
                        {row.login_request_id && <div>Login Req: {row.login_request_id.slice(0, 8)}…</div>}
                        {row.invoice_id && <div>Invoice: {row.invoice_id.slice(0, 8)}…</div>}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-xs text-red-600">
                        {row.error_message ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
