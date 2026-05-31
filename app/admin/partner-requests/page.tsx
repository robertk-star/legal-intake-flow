"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ── Types ─────────────────────────────────────────────────────────────────────

type Status = "new" | "reviewed" | "contacted" | "approved" | "declined";

interface PartnerRequest {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  firm_name: string;
  email: string;
  phone: string;
  website: string | null;
  states_served: string;
  practice_area: string;
  monthly_lead_capacity: string;
  message: string | null;
  internal_notes: string | null;
  status: Status;
  source: string;
}

interface PartnerAccount {
  id: string;
  firm_name: string;
  contact_first_name: string;
  contact_last_name: string;
  email: string;
  status: string;
  created_at: string;
  // Phase 6 preference fields (may be null if section04 migration not yet run)
  accepting_leads:         boolean | null;
  lead_status:             string | null;
  monthly_lead_capacity:   string | null;
  accepted_case_types:     string[] | null;
  accepted_languages:      string[] | null;
  accepts_initial_filings: boolean | null;
  accepts_appeals:         boolean | null;
  accepts_hearings:        boolean | null;
  accepts_child_cases:     boolean | null;
  lead_notes:              string | null;
}

const VALID_STATUSES: Status[] = ["new", "reviewed", "contacted", "approved", "declined"];

const STATUS_COLORS: Record<Status, string> = {
  new:       "bg-blue-100 text-blue-800",
  reviewed:  "bg-yellow-100 text-yellow-800",
  contacted: "bg-purple-100 text-purple-800",
  approved:  "bg-green-100 text-green-800",
  declined:  "bg-red-100 text-red-800",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${STATUS_COLORS[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status}
    </span>
  );
}

// ── Partner Account Panel ─────────────────────────────────────────────────────

function PartnerAccountPanel({
  request,
  currentStatus,
}: {
  request: PartnerRequest;
  currentStatus: Status;
}) {
  const [account, setAccount] = useState<PartnerAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [generatingLink, setGeneratingLink] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [linkExpiry, setLinkExpiry] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Auto-load existing partner account via GET on mount
  useEffect(() => {
    async function loadAccount() {
      setLoadingAccount(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/admin/partner-requests/${request.id}/partner-account`);
        const data = (await res.json()) as {
          success: boolean;
          found: boolean;
          data?: PartnerAccount;
          error?: string;
        };
        if (data.success && data.found && data.data) {
          setAccount(data.data);
        }
      } catch {
        setLoadError("Failed to check for existing partner account.");
      } finally {
        setLoadingAccount(false);
      }
    }
    loadAccount();
  }, [request.id]);

  async function handleCreateAccount() {
    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch(
        `/api/admin/partner-requests/${request.id}/create-partner-account`,
        { method: "POST" }
      );
      let data: {
        success: boolean;
        alreadyExists?: boolean;
        data?: PartnerAccount;
        error?: string;
        supabaseCode?: string | null;
        supabaseMessage?: string | null;
        hint?: string | null;
      };
      try {
        data = await res.json();
      } catch {
        setCreateError(`Server returned an unexpected response (HTTP ${res.status}). Check server logs.`);
        setCreating(false);
        return;
      }

      if (data.success && data.data) {
        setAccount(data.data);
      } else {
        // Build a detailed error string for the admin
        let msg = data.error ?? "Failed to create partner account.";
        if (data.supabaseCode) msg += ` [code: ${data.supabaseCode}]`;
        if (data.hint) msg += ` Hint: ${data.hint}`;
        setCreateError(msg);
      }
    } catch {
      setCreateError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function handleGenerateLink() {
    if (!account) return;
    setGeneratingLink(true);
    setLinkError(null);
    setLoginUrl(null);
    setCopied(false);

    try {
      const res = await fetch(
        `/api/admin/partners/${account.id}/generate-login-link`,
        { method: "POST" }
      );
      const data = (await res.json()) as {
        success: boolean;
        loginUrl?: string;
        expiresAt?: string;
        error?: string;
      };

      if (data.success && data.loginUrl) {
        setLoginUrl(data.loginUrl);
        setLinkExpiry(data.expiresAt ?? null);
      } else {
        setLinkError(data.error ?? "Failed to generate login link.");
      }
    } catch {
      setLinkError("Network error. Please try again.");
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleCopy() {
    if (!loginUrl) return;
    try {
      await navigator.clipboard.writeText(loginUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // silent fallback
    }
  }

  const isApproved = currentStatus === "approved";

  return (
    <section className="border-t border-gray-100 pt-4 space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Partner Account
      </h3>

      {/* Loading state */}
      {loadingAccount && (
        <div className="animate-pulse h-8 rounded bg-gray-100" />
      )}

      {/* Load error */}
      {!loadingAccount && loadError && (
        <p className="text-sm text-red-600">{loadError}</p>
      )}

      {/* No account yet */}
      {!loadingAccount && !account && (
        <div className="space-y-3">
          {/* Block message if not approved */}
          {!isApproved && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              <strong>Status must be set to &ldquo;Approved&rdquo;</strong> before a partner account can be created.
              Current status: <span className="font-semibold capitalize">{currentStatus}</span>.
            </div>
          )}

          <button
            onClick={handleCreateAccount}
            disabled={creating || !isApproved}
            title={!isApproved ? "Set request status to Approved before creating a partner account." : undefined}
            className="rounded-md bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {creating ? "Creating Account…" : "Create Partner Account"}
          </button>

          {createError && (
            <p className="text-sm text-red-600">{createError}</p>
          )}
        </div>
      )}

      {/* Account exists */}
      {!loadingAccount && account && (
        <div className="space-y-4">
          {/* Account summary */}
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm">
            <p className="font-semibold text-green-800">{account.firm_name}</p>
            <p className="text-green-700">
              {account.contact_first_name} {account.contact_last_name} — {account.email}
            </p>
            <p className="mt-1 text-xs text-green-600">
              Account status: <span className="font-semibold capitalize">{account.status}</span>
              {" · "}Created {formatDate(account.created_at)}
            </p>
          </div>

          {/* Read-only partner preferences */}
          {(account.lead_status !== null || account.accepting_leads !== null) && (
            <div className="rounded-md border border-gray-200 bg-gray-50 px-4 py-3 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Lead Preferences</p>
              <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                <PrefField
                  label="Accepting Leads"
                  value={account.accepting_leads === null ? "—" : account.accepting_leads ? "Yes" : "No"}
                />
                <PrefField
                  label="Lead Status"
                  value={account.lead_status
                    ? account.lead_status.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())
                    : "—"}
                />
                <PrefField
                  label="Monthly Lead Capacity"
                  value={account.monthly_lead_capacity ?? "—"}
                />
                <PrefField
                  label="Benefit Programs"
                  value={
                    account.accepted_case_types && account.accepted_case_types.length > 0
                      ? account.accepted_case_types.join(", ")
                      : "—"
                  }
                />
                <PrefField
                  label="Initial Filings"
                  value={account.accepts_initial_filings === null ? "—" : account.accepts_initial_filings ? "Yes" : "No"}
                />
                <PrefField
                  label="Appeals"
                  value={account.accepts_appeals === null ? "—" : account.accepts_appeals ? "Yes" : "No"}
                />
                <PrefField
                  label="Hearings"
                  value={account.accepts_hearings === null ? "—" : account.accepts_hearings ? "Yes" : "No"}
                />
                <PrefField
                  label="Child Disability Cases"
                  value={account.accepts_child_cases === null ? "—" : account.accepts_child_cases ? "Yes" : "No"}
                />
                <PrefField
                  label="Accepted Languages"
                  value={
                    account.accepted_languages && account.accepted_languages.length > 0
                      ? account.accepted_languages.join(", ")
                      : "—"
                  }
                />
                {account.lead_notes && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium text-gray-400">Lead Notes</dt>
                    <dd className="mt-0.5 text-gray-800 whitespace-pre-wrap">{account.lead_notes}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Generate login link */}
          <div className="space-y-3">
            <button
              onClick={handleGenerateLink}
              disabled={generatingLink}
              className="rounded-md bg-[#1a3a8f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#162e75] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generatingLink ? "Generating…" : "Generate Partner Login Link"}
            </button>

            {linkError && (
              <p className="text-sm text-red-600">{linkError}</p>
            )}

            {loginUrl && (
              <div className="space-y-2">
                {/* One-time warning */}
                <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <strong>Copy this link now.</strong> For security, it will only be shown once.
                  {linkExpiry && (
                    <span className="block mt-0.5 text-amber-700">
                      Expires:{" "}
                      {new Date(linkExpiry).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>

                {/* Link display + copy */}
                <div className="flex items-start gap-2">
                  <code className="flex-1 break-all rounded-md border border-gray-300 bg-gray-50 px-3 py-2 text-xs text-gray-800 font-mono">
                    {loginUrl}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`shrink-0 rounded-md px-3 py-2 text-xs font-semibold transition-colors ${
                      copied
                        ? "bg-green-600 text-white"
                        : "bg-gray-800 text-white hover:bg-gray-700"
                    }`}
                  >
                    {copied ? "Copied ✓" : "Copy Login Link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function DetailModal({
  request,
  onClose,
  onUpdated,
}: {
  request: PartnerRequest;
  onClose: () => void;
  onUpdated: (updated: PartnerRequest) => void;
}) {
  const [status, setStatus] = useState<Status>(request.status);
  const [notes, setNotes] = useState(request.internal_notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/admin/partner-requests/${request.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internal_notes: notes }),
      });

      const data = (await res.json()) as {
        success: boolean;
        data?: PartnerRequest;
        error?: string;
      };

      if (data.success && data.data) {
        setSaveSuccess(true);
        onUpdated(data.data);
        setTimeout(() => setSaveSuccess(false), 2000);
      } else {
        setSaveError(data.error ?? "Failed to save.");
      }
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0d1b2e]">
              {request.first_name} {request.last_name}
            </h2>
            <p className="text-sm text-gray-500">{request.firm_name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Contact info */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Contact</h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <Field label="Email" value={<a href={`mailto:${request.email}`} className="text-blue-600 hover:underline">{request.email}</a>} />
              <Field label="Phone" value={request.phone} />
              {request.website && (
                <Field
                  label="Website"
                  value={
                    <a href={request.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
                      {request.website}
                    </a>
                  }
                />
              )}
              <Field label="Source" value={request.source} />
            </dl>
          </section>

          {/* Practice info */}
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Practice</h3>
            <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
              <Field label="States Served" value={request.states_served} />
              <Field label="Practice Area" value={request.practice_area} />
              <Field label="Monthly Capacity" value={request.monthly_lead_capacity} />
            </dl>
          </section>

          {/* Message */}
          {request.message && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Message</h3>
              <p className="rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-700 whitespace-pre-wrap">
                {request.message}
              </p>
            </section>
          )}

          {/* Timestamps */}
          <section>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <Field label="Submitted" value={formatDate(request.created_at)} />
              <Field label="Last Updated" value={formatDate(request.updated_at)} />
            </dl>
          </section>

          {/* Status update */}
          <section className="border-t border-gray-100 pt-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">Update Status</h3>
            <div className="flex flex-wrap gap-2">
              {VALID_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition-all ${
                    status === s
                      ? STATUS_COLORS[s] + " ring-2 ring-offset-1 ring-current"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>

          {/* Internal notes */}
          <section>
            <label htmlFor="internal-notes" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">
              Internal Notes
            </label>
            <textarea
              id="internal-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add internal notes (not visible to partners)…"
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </section>

          {/* Save error */}
          {saveError && (
            <p className="text-sm text-red-600">{saveError}</p>
          )}

          {/* Partner Account Panel — passes live status so the Create button reflects unsaved changes */}
          <PartnerAccountPanel request={request} currentStatus={status} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700">
            Close
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-[#0d1b2e] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#162840] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : saveSuccess ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-gray-800">{value ?? <span className="text-gray-400 italic">—</span>}</dd>
    </div>
  );
}

function PrefField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800">{value}</dd>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function AdminPartnerRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [selectedRequest, setSelectedRequest] = useState<PartnerRequest | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchRequests = useCallback(
    async (q: string, s: string) => {
      setLoading(true);
      setFetchError(null);

      const params = new URLSearchParams();
      if (s) params.set("status", s);
      if (q) params.set("search", q);

      try {
        const res = await fetch(`/api/admin/partner-requests?${params.toString()}`);

        if (res.status === 401) {
          setAuthError(true);
          router.push("/admin/login");
          return;
        }

        const data = (await res.json()) as {
          success: boolean;
          data?: PartnerRequest[];
          error?: string;
        };

        if (data.success && data.data) {
          setRequests(data.data);
        } else {
          setFetchError(data.error ?? "Failed to load requests.");
        }
      } catch {
        setFetchError("Network error. Please refresh.");
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchRequests("", "");
  }, [fetchRequests]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRequests(search, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, fetchRequests]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
  }

  function handleRequestUpdated(updated: PartnerRequest) {
    setRequests((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setSelectedRequest(updated);
  }

  if (authError) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Admin nav */}
      <header className="border-b border-gray-200 bg-[#0d1b2e]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Image
              src="/images/lif-name-logo.png"
              alt="Legal Intake Flow"
              width={160}
              height={32}
              className="h-8 w-auto object-contain brightness-0 invert"
            />
            <span className="hidden text-xs font-semibold uppercase tracking-widest text-gray-400 sm:block">
              Admin
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-white">Partner Requests</span>
            <a href="/admin/partners" className="text-sm text-gray-300 hover:text-white">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-300 hover:text-white">Lead Queue</a>
            <a href="/admin/notifications" className="text-sm text-gray-300 hover:text-white">Notifications</a>
            <a href="/admin/reports" className="text-sm text-gray-300 hover:text-white">Reports</a>
            <a href="/admin/billing" className="text-sm text-gray-300 hover:text-white">Billing</a>
            <a href="/admin/system-check" className="text-sm text-gray-300 hover:text-white">System Check</a>
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="rounded-md border border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-400 hover:text-white disabled:opacity-50"
            >
              {loggingOut ? "Signing out…" : "Sign Out"}
            </button>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        {/* Page heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#0d1b2e]">Partner Requests</h1>
            <p className="mt-1 text-sm text-gray-500">
              {loading
                ? "Loading…"
                : `${requests.length} request${requests.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          {/* Search + filter */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="search"
              placeholder="Search name, firm, email, phone, state…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-72"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as Status | "")}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {VALID_STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {fetchError}
          </div>
        )}

        {/* Table */}
        {!loading && requests.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
            <p className="text-gray-500">No partner requests found.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Date", "Name", "Firm", "Email", "Phone",
                      "States", "Practice Area", "Capacity", "Status", "Actions",
                    ].map((col) => (
                      <th
                        key={col}
                        className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 whitespace-nowrap"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="animate-pulse">
                          {Array.from({ length: 10 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 rounded bg-gray-100" />
                            </td>
                          ))}
                        </tr>
                      ))
                    : requests.map((req) => (
                        <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                            {formatDate(req.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                            {req.first_name} {req.last_name}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap max-w-[160px] truncate">
                            {req.firm_name}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                            <a href={`mailto:${req.email}`} className="hover:text-blue-600 hover:underline">
                              {req.email}
                            </a>
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{req.phone}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-[120px] truncate">{req.states_served}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{req.practice_area}</td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{req.monthly_lead_capacity}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <StatusBadge status={req.status} />
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => setSelectedRequest(req)}
                              className="rounded-md bg-[#0d1b2e] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#162840]"
                            >
                              View / Edit
                            </button>
                          </td>
                        </tr>
                      ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Detail modal */}
      {selectedRequest && (
        <DetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onUpdated={handleRequestUpdated}
        />
      )}
    </div>
  );
}
