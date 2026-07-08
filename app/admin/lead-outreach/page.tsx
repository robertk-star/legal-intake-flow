"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type LeadRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  state: string | null;
  benefit_type: string | null;
  application_status: string | null;
  status: string;
  assigned_partner_account_id: string | null;
};

type LeadDetail = LeadRow & {
  city: string | null;
  zip: string | null;
  medical_summary: string | null;
  additional_notes: string | null;
  lead_outreach_email_sent_at?: string | null;
  lead_outreach_email_count?: number | null;
};

type OutreachEmail = {
  id: string;
  created_at: string;
  recipient_email: string;
  recipient_name: string | null;
  sender_email: string;
  sender_name: string | null;
  subject: string;
  body_text: string;
  status: "queued" | "sent" | "failed" | "skipped";
  provider: string;
  provider_message_id: string | null;
  sent_at: string | null;
  error_message: string | null;
  sent_by: string;
};

const TEMPLATES = [
  {
    label: "Could not reach you",
    subject: "We are trying to reach you about your disability benefits information",
    body: "Hello,\n\nWe are trying to reach you about the disability benefits information you submitted. A representative may need to confirm a few details before they can review your information.\n\nPlease reply to this email with the best phone number and the best time to reach you.\n\nThank you,\nDisability Benefits Screening",
  },
  {
    label: "Need more information",
    subject: "More information is needed for your disability benefits review",
    body: "Hello,\n\nWe reviewed the information you submitted and may need a few more details before your information can be fully reviewed.\n\nPlease reply to this email and let us know the best way to reach you.\n\nThank you,\nDisability Benefits Screening",
  },
  {
    label: "Final follow-up",
    subject: "Final follow-up about your disability benefits information",
    body: "Hello,\n\nWe are following up again about the disability benefits information you submitted. If you still want help, please reply to this email with the best number and time to reach you.\n\nIf we do not hear back, we may not be able to continue reviewing your information.\n\nThank you,\nDisability Benefits Screening",
  },
];

function leadName(lead: Pick<LeadRow, "first_name" | "last_name">) {
  const name = `${lead.first_name ?? ""} ${lead.last_name ?? ""}`.trim();
  return name || "Unnamed Lead";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatusPill({ status }: { status: string }) {
  const color = status === "sent"
    ? "bg-green-100 text-green-800"
    : status === "failed"
    ? "bg-red-100 text-red-700"
    : status === "skipped"
    ? "bg-amber-100 text-amber-800"
    : "bg-gray-100 text-gray-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{status}</span>;
}

export default function LeadOutreachPage() {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetail | null>(null);
  const [emails, setEmails] = useState<OutreachEmail[]>([]);
  const [search, setSearch] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subject, setSubject] = useState(TEMPLATES[0].subject);
  const [message, setMessage] = useState(TEMPLATES[0].body);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const selectedLeadFromList = useMemo(
    () => leads.find((lead) => lead.id === selectedLeadId) ?? null,
    [leads, selectedLeadId]
  );

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    setError(null);
    const params = new URLSearchParams();
    params.set("source", "dbs");
    params.set("limit", "100");
    if (search.trim()) params.set("search", search.trim());

    try {
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to load leads.");
        return;
      }
      setLeads(data.data ?? []);
      if (!selectedLeadId && data.data?.[0]?.id) setSelectedLeadId(data.data[0].id);
    } catch {
      setError("Network error loading leads.");
    } finally {
      setLoadingLeads(false);
    }
  }, [router, search, selectedLeadId]);

  const fetchSelectedLead = useCallback(async () => {
    if (!selectedLeadId) return;
    setLoadingDetail(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`/api/admin/leads/${selectedLeadId}`),
        fetch(`/api/admin/leads/${selectedLeadId}/lead-emails`),
      ]);

      if (detailRes.status === 401 || historyRes.status === 401) {
        router.push("/admin/login");
        return;
      }

      const detailData = await detailRes.json().catch(() => ({}));
      const historyData = await historyRes.json().catch(() => ({}));

      if (!detailRes.ok) {
        setError(detailData.error ?? "Failed to load lead detail.");
        return;
      }
      if (!historyRes.ok) {
        setError(historyData.error ?? "Failed to load lead email history.");
        return;
      }

      setSelectedLead(detailData.data ?? null);
      setEmails(historyData.data ?? []);
    } catch {
      setError("Network error loading lead outreach detail.");
    } finally {
      setLoadingDetail(false);
    }
  }, [router, selectedLeadId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);
  useEffect(() => { fetchSelectedLead(); }, [fetchSelectedLead]);

  function applyTemplate(index: number) {
    const template = TEMPLATES[index];
    if (!template) return;
    setSubject(template.subject);
    setMessage(template.body);
  }

  async function handleSend() {
    if (!selectedLeadId) return;
    setSending(true);
    setSendError(null);
    setSendSuccess(null);

    try {
      const res = await fetch(`/api/admin/leads/${selectedLeadId}/send-lead-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error ?? "Failed to send lead email.");
        if (data.data) setEmails((prev) => [data.data, ...prev]);
        return;
      }
      if (data.data) setEmails((prev) => [data.data, ...prev]);
      setSendSuccess("Email sent and logged.");
      await fetchSelectedLead();
    } catch {
      setSendError("Network error sending lead email.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/lead-outreach" className="text-sm font-semibold text-[#1a3a5c]">Lead Outreach</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Lead Email Outreach</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send follow-up emails directly to a lead when the partner/client cannot reach them. Every email is logged in LIF.
          </p>
        </div>

        {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <section className="rounded-xl border border-gray-200 bg-white shadow-sm lg:col-span-1">
            <div className="border-b border-gray-100 p-4">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">Find Lead</label>
              <div className="mt-2 flex gap-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => { if (event.key === "Enter") fetchLeads(); }}
                  placeholder="Search name, email, phone, ref…"
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                />
                <button onClick={fetchLeads} className="rounded-lg border border-[#1a3a5c] px-3 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white">Search</button>
              </div>
            </div>
            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
              {loadingLeads ? (
                <div className="p-6 text-center text-sm text-gray-400">Loading leads…</div>
              ) : leads.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">No leads found.</div>
              ) : leads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLeadId(lead.id)}
                  className={`block w-full px-4 py-3 text-left hover:bg-gray-50 ${selectedLeadId === lead.id ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{leadName(lead)}</p>
                      <p className="text-xs text-gray-500">{lead.email || "No email"}</p>
                      <p className="mt-1 text-xs text-gray-400">{lead.state || "—"} · {lead.benefit_type || "—"} · {lead.application_status || "—"}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${lead.email ? "bg-green-100 text-green-800" : "bg-red-100 text-red-700"}`}>
                      {lead.email ? "Email" : "No email"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-6 lg:col-span-2">
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-lg font-bold text-[#0d1b2e]">{selectedLead ? leadName(selectedLead) : selectedLeadFromList ? leadName(selectedLeadFromList) : "Select a lead"}</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedLead?.email || selectedLeadFromList?.email || "No lead selected."}
                  </p>
                </div>
                {selectedLead && (
                  <div className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500">
                    Last outreach: {formatDateTime(selectedLead.lead_outreach_email_sent_at)}<br />
                    Outreach count: {selectedLead.lead_outreach_email_count ?? emails.filter((email) => email.status === "sent").length}
                  </div>
                )}
              </div>

              {loadingDetail ? (
                <div className="mt-6 text-sm text-gray-400">Loading selected lead…</div>
              ) : selectedLead ? (
                <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
                  <div><span className="text-xs uppercase text-gray-400">Phone</span><br />{selectedLead.phone || "—"}</div>
                  <div><span className="text-xs uppercase text-gray-400">State</span><br />{selectedLead.state || "—"}</div>
                  <div><span className="text-xs uppercase text-gray-400">Application</span><br />{selectedLead.application_status || "—"}</div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-gray-400">Choose a lead on the left to start an outreach email.</p>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#0d1b2e]">Send Email to Lead</h2>
              <p className="mt-1 text-sm text-gray-500">Sender is configured through Gmail SMTP, normally support@disabilitybenefitsscreening.com.</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {TEMPLATES.map((template, index) => (
                  <button
                    key={template.label}
                    type="button"
                    onClick={() => applyTemplate(index)}
                    className="rounded-full border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:border-[#1a3a5c] hover:text-[#1a3a5c]"
                  >
                    {template.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Subject</label>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-400">Message</label>
                  <textarea
                    rows={10}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    className="block w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  />
                </div>

                {sendError && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>}
                {sendSuccess && <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{sendSuccess}</p>}

                <button
                  onClick={handleSend}
                  disabled={sending || !selectedLead || !selectedLead.email}
                  className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send Email to Lead"}
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-[#0d1b2e]">Email History</h2>
              <div className="mt-4 space-y-3">
                {emails.length === 0 ? (
                  <p className="text-sm italic text-gray-400">No outreach emails have been sent to this lead yet.</p>
                ) : emails.map((email) => (
                  <div key={email.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{email.subject}</p>
                        <p className="mt-1 text-xs text-gray-500">To: {email.recipient_email} · From: {email.sender_email}</p>
                        <p className="mt-1 text-xs text-gray-400">Created {formatDateTime(email.created_at)} · Sent {formatDateTime(email.sent_at)}</p>
                      </div>
                      <StatusPill status={email.status} />
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{email.body_text}</p>
                    {email.error_message && <p className="mt-3 text-xs text-red-600">Error: {email.error_message}</p>}
                    {email.provider_message_id && <p className="mt-2 text-xs text-gray-400">Provider ID: {email.provider_message_id}</p>}
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
