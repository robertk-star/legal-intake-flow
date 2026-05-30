"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type LeadStatus = "new" | "reviewing" | "ready_to_match" | "matched" | "closed" | "spam";

/** Lightweight row returned by the list endpoint */
interface LeadRow {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string | null;
  city: string | null;
  state: string;
  zip: string | null;
  preferred_contact_method: string | null;
  lives_in_us: boolean | null;
  age_range: string | null;
  benefit_type: string | null;
  application_status: string | null;
  has_attorney: string | null;
  status: LeadStatus;
  assigned_partner_account_id: string | null;
  reviewed_at: string | null;
}

/** Full record returned by the detail endpoint */
interface LeadDetail extends LeadRow {
  medical_summary: string | null;
  additional_notes: string | null;
  consent_given: boolean;
  review_notes: string | null;
}

interface PartnerAccount {
  id: string;
  firm_name: string;
  status: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const LEAD_STATUS_OPTIONS: LeadStatus[] = [
  "new", "reviewing", "ready_to_match", "matched", "closed", "spam",
];

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  new:             "bg-blue-100 text-blue-800",
  reviewing:       "bg-yellow-100 text-yellow-800",
  ready_to_match:  "bg-purple-100 text-purple-800",
  matched:         "bg-green-100 text-green-800",
  closed:          "bg-gray-100 text-gray-600",
  spam:            "bg-red-100 text-red-700",
};

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new:             "New",
  reviewing:       "Reviewing",
  ready_to_match:  "Ready to Match",
  matched:         "Matched",
  closed:          "Closed",
  spam:            "Spam",
};

const BENEFIT_TYPE_OPTIONS = ["SSDI", "SSI", "Both", "Not Sure"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatDateTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${colorClass}`}>
      {label.replace(/_/g, " ")}
    </span>
  );
}

function DetailField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">
        {value != null && value !== "" ? value : <span className="italic text-gray-400">—</span>}
      </dd>
    </div>
  );
}

// ── Lead Detail Modal ─────────────────────────────────────────────────────────

function LeadDetailModal({
  leadId,
  partners,
  onClose,
  onUpdated,
}: {
  leadId: string;
  partners: PartnerAccount[];
  onClose: () => void;
  onUpdated: (updated: Partial<LeadDetail> & { id: string }) => void;
}) {
  const [lead, setLead]               = useState<LeadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Editable admin fields — initialised once lead loads
  const [status, setStatus]           = useState<LeadStatus>("new");
  const [reviewNotes, setReviewNotes] = useState("");
  const [assignedId, setAssignedId]   = useState("");

  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch full lead detail on mount
  useEffect(() => {
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    fetch(`/api/admin/leads/${leadId}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok) {
          setDetailError(data.error ?? "Failed to load lead details.");
          return;
        }
        const fullLead: LeadDetail = data.data;
        setLead(fullLead);
        setStatus(fullLead.status);
        setReviewNotes(fullLead.review_notes ?? "");
        setAssignedId(fullLead.assigned_partner_account_id ?? "");
      })
      .catch(() => {
        if (!cancelled) setDetailError("Network error. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });

    return () => { cancelled = true; };
  }, [leadId]);

  async function handleSave() {
    if (!lead) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const payload: Record<string, unknown> = {
      status,
      review_notes: reviewNotes,
      assigned_partner_account_id: assignedId || null,
    };

    try {
      const res = await fetch(`/api/admin/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save changes.");
        return;
      }
      setSaveSuccess(true);
      const updated = { id: lead.id, ...data.data } as Partial<LeadDetail> & { id: string };
      setLead((prev) => prev ? { ...prev, ...updated } : prev);
      onUpdated(updated);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const assignedPartner = partners.find((p) => p.id === (assignedId || lead?.assigned_partner_account_id));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            {lead ? (
              <>
                <h2 className="text-lg font-bold text-[#0d1b2e]">
                  {lead.first_name} {lead.last_name}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Submitted {formatDateTime(lead.created_at)}</p>
              </>
            ) : (
              <h2 className="text-lg font-bold text-[#0d1b2e]">Lead Detail</h2>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6 overflow-y-auto max-h-[75vh]">

          {/* Loading state */}
          {detailLoading && (
            <div className="flex items-center justify-center py-12 text-sm text-gray-400">
              Loading lead details…
            </div>
          )}

          {/* Error state */}
          {!detailLoading && detailError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {detailError}
            </div>
          )}

          {/* Full lead content */}
          {!detailLoading && !detailError && lead && (
            <>
              {/* Contact Info */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Contact Information</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailField label="Phone" value={lead.phone} />
                  <DetailField label="Email" value={lead.email} />
                  <DetailField label="City" value={lead.city} />
                  <DetailField label="State" value={lead.state} />
                  <DetailField label="ZIP" value={lead.zip} />
                  <DetailField label="Preferred Contact" value={lead.preferred_contact_method} />
                </dl>
              </section>

              {/* Intake Responses */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Intake Responses</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <DetailField
                    label="Lives in U.S."
                    value={lead.lives_in_us === true ? "Yes" : lead.lives_in_us === false ? "No" : null}
                  />
                  <DetailField label="Age Range" value={lead.age_range} />
                  <DetailField label="Benefit Type" value={lead.benefit_type} />
                  <DetailField label="Application Status" value={lead.application_status} />
                  <DetailField label="Has Attorney" value={lead.has_attorney} />
                </dl>
              </section>

              {/* Medical Summary */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Medical Summary</h3>
                {lead.medical_summary ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    {lead.medical_summary}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-400">Not provided.</p>
                )}
              </section>

              {/* Additional Notes */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Additional Notes</h3>
                {lead.additional_notes ? (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                    {lead.additional_notes}
                  </p>
                ) : (
                  <p className="text-sm italic text-gray-400">Not provided.</p>
                )}
              </section>

              {/* Consent Status */}
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Consent</h3>
                <div className="flex items-center gap-2">
                  {lead.consent_given ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      Consent given
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-800">
                      Consent not given
                    </span>
                  )}
                </div>
              </section>

              {/* Admin Actions */}
              <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Admin Actions</h3>

                {/* Status */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lead Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LeadStatus)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  >
                    {LEAD_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Partner Assignment */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Assign Partner Account
                    <span className="ml-1 font-normal text-gray-400">(manual only — no automatic routing)</span>
                  </label>
                  <select
                    value={assignedId}
                    onChange={(e) => setAssignedId(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  >
                    <option value="">— Unassigned —</option>
                    {partners
                      .filter((p) => p.status === "active")
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.firm_name}</option>
                      ))}
                  </select>
                  {assignedPartner && (
                    <p className="mt-1 text-xs text-gray-500">
                      Currently assigned: <strong>{assignedPartner.firm_name}</strong>
                    </p>
                  )}
                </div>

                {/* Review Notes */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Internal Review Notes</label>
                  <textarea
                    rows={3}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 resize-y focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                    placeholder="Add internal notes…"
                  />
                  {lead.reviewed_at && (
                    <p className="mt-1 text-xs text-gray-400">Last reviewed: {formatDateTime(lead.reviewed_at)}</p>
                  )}
                </div>

                {saveError   && <p className="text-xs text-red-600">{saveError}</p>}
                {saveSuccess && <p className="text-xs text-green-600">Changes saved.</p>}

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:opacity-50 transition"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminLeadsPage() {
  const router = useRouter();

  const [leads, setLeads]               = useState<LeadRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadError, setLoadError]       = useState<string | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  // Partners list for assignment dropdown
  const [partners, setPartners]         = useState<PartnerAccount[]>([]);

  // Filters
  const [search, setSearch]             = useState("");
  const [stateFilter, setStateFilter]   = useState("");
  const [benefitFilter, setBenefitFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (search)         params.set("search", search);
    if (stateFilter)    params.set("state", stateFilter);
    if (benefitFilter)  params.set("benefit_type", benefitFilter);
    if (statusFilter)   params.set("status", statusFilter);
    if (assignedFilter) params.set("assigned", assignedFilter);

    try {
      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(data.error ?? "Failed to load leads."); return; }
      setLeads(data.data ?? []);
    } catch {
      setLoadError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, stateFilter, benefitFilter, statusFilter, assignedFilter, router]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Fetch active partner accounts for assignment dropdown
  useEffect(() => {
    fetch("/api/admin/partners?status=active&limit=200")
      .then((r) => r.json())
      .then((d) => { if (d.data) setPartners(d.data); })
      .catch(() => {});
  }, []);

  function handleUpdated(updated: Partial<LeadDetail> & { id: string }) {
    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm font-semibold text-[#1a3a5c]">Lead Queue</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Lead Queue</h1>
          <p className="mt-1 text-sm text-gray-500">
            Review submitted claimant intake forms. Manual assignment only — no automatic routing.
          </p>
        </div>

        {/* Filters */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <input
              type="text"
              placeholder="Search name, email, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] lg:col-span-2"
            />
            <input
              type="text"
              placeholder="State (e.g. CA)"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
              maxLength={2}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c] uppercase"
            />
            <select
              value={benefitFilter}
              onChange={(e) => setBenefitFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              <option value="">All Benefit Types</option>
              {BENEFIT_TYPE_OPTIONS.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              <option value="">All Statuses</option>
              {LEAD_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{LEAD_STATUS_LABELS[s]}</option>
              ))}
            </select>
            <select
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
            >
              <option value="">All Leads</option>
              <option value="false">Unassigned</option>
              <option value="true">Assigned</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loadError && (
            <div className="px-6 py-4 text-sm text-red-600 bg-red-50 border-b border-red-100">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              Loading leads…
            </div>
          ) : leads.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">
              No leads found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Submitted</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">State</th>
                    <th className="px-4 py-3 text-left">Benefit Type</th>
                    <th className="px-4 py-3 text-left">App. Status</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Assigned Partner</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => {
                    const assignedPartner = partners.find((p) => p.id === lead.assigned_partner_account_id);
                    return (
                      <tr key={lead.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                          {formatDate(lead.created_at)}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                          {lead.first_name} {lead.last_name}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{lead.state}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {lead.benefit_type ?? <span className="italic text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">
                          {lead.application_status ?? <span className="italic text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={LEAD_STATUS_LABELS[lead.status] ?? lead.status}
                            colorClass={LEAD_STATUS_COLORS[lead.status] ?? "bg-gray-100 text-gray-700"}
                          />
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {assignedPartner
                            ? assignedPartner.firm_name
                            : <span className="italic text-gray-400">Unassigned</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 space-y-0.5">
                          <div>{lead.phone}</div>
                          {lead.email && <div className="text-gray-400">{lead.email}</div>}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedLeadId(lead.id)}
                            className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white transition"
                          >
                            View Lead
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-gray-400 text-center">
          Showing {leads.length} lead{leads.length !== 1 ? "s" : ""}.
          No automatic routing — all partner assignments are manual.
        </p>
      </main>

      {selectedLeadId && (
        <LeadDetailModal
          leadId={selectedLeadId}
          partners={partners}
          onClose={() => setSelectedLeadId(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
