"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// ── Types ─────────────────────────────────────────────────────────────────────

type AccountStatus = "active" | "inactive" | "pending" | "suspended";
type LeadStatus    = "active" | "paused" | "at_capacity";
type UserRole      = "owner" | "admin" | "staff" | "viewer";
type UserStatus    = "active" | "inactive" | "pending" | "suspended";

interface PartnerAccount {
  id: string;
  firm_name: string;
  contact_first_name: string;
  contact_last_name: string;
  email: string;
  phone: string | null;
  website: string | null;
  states_served: string | null;
  practice_area: string | null;
  monthly_lead_capacity: string | null;
  routing_states?: string[] | null;
  profile_updated_at?: string | null;
  billing_contact_name?: string | null;
  billing_contact_email?: string | null;
  billing_contact_phone?: string | null;
  billing_address_line1?: string | null;
  billing_address_line2?: string | null;
  billing_city?: string | null;
  billing_state?: string | null;
  billing_zip?: string | null;
  billing_notes?: string | null;
  status: AccountStatus;
  accepting_leads: boolean | null;
  lead_status: LeadStatus | null;
  last_login_at: string | null;
  created_at: string;
  // Detail fields
  internal_notes?: string | null;
  accepted_case_types?: string[] | null;
  accepted_languages?: string[] | null;
  accepts_initial_filings?: boolean | null;
  accepts_appeals?: boolean | null;
  accepts_hearings?: boolean | null;
  accepts_child_cases?: boolean | null;
  lead_notes?: string | null;
}

interface PartnerUser {
  id: string;
  created_at: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  status: UserStatus;
  last_login_at: string | null;
  invited_at: string | null;
  accepted_at: string | null;
}

interface LoginRequest {
  id: string;
  created_at: string;
  email: string;
  partner_account_id: string | null;
  partner_user_id: string | null;
  status: "new" | "completed" | "dismissed";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ACCOUNT_STATUS_OPTIONS: AccountStatus[] = ["active", "inactive", "pending", "suspended"];
const LEAD_STATUS_OPTIONS: LeadStatus[]        = ["active", "paused", "at_capacity"];
const USER_ROLE_OPTIONS: UserRole[]            = ["owner", "admin", "staff", "viewer"];
const USER_STATUS_OPTIONS: UserStatus[]        = ["active", "inactive", "pending", "suspended"];

const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  active:    "bg-green-100 text-green-800",
  inactive:  "bg-gray-100 text-gray-700",
  pending:   "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
};

const LEAD_STATUS_COLORS: Record<LeadStatus, string> = {
  active:      "bg-blue-100 text-blue-800",
  paused:      "bg-yellow-100 text-yellow-800",
  at_capacity: "bg-orange-100 text-orange-800",
};

const USER_STATUS_COLORS: Record<UserStatus, string> = {
  active:    "bg-green-100 text-green-800",
  inactive:  "bg-gray-100 text-gray-700",
  pending:   "bg-yellow-100 text-yellow-800",
  suspended: "bg-red-100 text-red-800",
};

const LOGIN_REQUEST_STATUS_COLORS: Record<string, string> = {
  new:       "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

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

function PrefRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-44 shrink-0 font-medium text-gray-600">{label}</span>
      <span className="text-gray-900">{value ?? "—"}</span>
    </div>
  );
}

// ── Add/Edit User Form ────────────────────────────────────────────────────────

function UserForm({
  partnerAccountId,
  editUser,
  onSaved,
  onCancel,
}: {
  partnerAccountId: string;
  editUser: PartnerUser | null;
  onSaved: (user: PartnerUser) => void;
  onCancel: () => void;
}) {
  const [firstName, setFirstName] = useState(editUser?.first_name ?? "");
  const [lastName,  setLastName]  = useState(editUser?.last_name  ?? "");
  const [email,     setEmail]     = useState(editUser?.email      ?? "");
  const [role,      setRole]      = useState<UserRole>(editUser?.role ?? "staff");
  const [status,    setStatus]    = useState<UserStatus>(editUser?.status ?? "pending");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      let res: Response;
      if (editUser) {
        res = await fetch(`/api/admin/partner-users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ first_name: firstName, last_name: lastName, role, status }),
        });
      } else {
        res = await fetch(`/api/admin/partners/${partnerAccountId}/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ first_name: firstName, last_name: lastName, email, role }),
        });
      }

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to save user.");
        return;
      }
      onSaved(data.data as PartnerUser);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <h4 className="text-sm font-semibold text-[#0d1b2e]">
        {editUser ? "Edit Partner User" : "Add Partner User"}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">First Name *</label>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Last Name *</label>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {!editUser && (
        <div>
          <label className="block text-xs font-medium text-gray-600">Email *</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {USER_ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        {editUser && (
          <div>
            <label className="block text-xs font-medium text-gray-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as UserStatus)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {USER_STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving…" : editUser ? "Save Changes" : "Add User"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Partner Users Section ─────────────────────────────────────────────────────

function PartnerUsersSection({ partnerAccountId }: { partnerAccountId: string }) {
  const [users, setUsers]             = useState<PartnerUser[]>([]);
  const [loading, setLoading]         = useState(true);
  const [loadError, setLoadError]     = useState<string | null>(null);
  const [showForm, setShowForm]       = useState(false);
  const [editingUser, setEditingUser] = useState<PartnerUser | null>(null);

  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [loginLinks, setLoginLinks]       = useState<Record<string, { url: string; expiry: string }>>({});
  const [copiedUserId, setCopiedUserId]   = useState<string | null>(null);
  const [linkErrors, setLinkErrors]       = useState<Record<string, string>>({});

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/admin/partners/${partnerAccountId}/users`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(data.error ?? "Failed to load users."); return; }
      setUsers(data.data ?? []);
    } catch {
      setLoadError("Network error.");
    } finally {
      setLoading(false);
    }
  }, [partnerAccountId]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  function handleUserSaved(user: PartnerUser) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === user.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = user;
        return next;
      }
      return [...prev, user];
    });
    setShowForm(false);
    setEditingUser(null);
  }

  async function handleGenerateLink(userId: string) {
    setGeneratingFor(userId);
    setLinkErrors((prev) => ({ ...prev, [userId]: "" }));
    try {
      const res = await fetch(`/api/admin/partner-users/${userId}/generate-login-link`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkErrors((prev) => ({ ...prev, [userId]: data.error ?? "Failed to generate link." }));
        return;
      }
      setLoginLinks((prev) => ({
        ...prev,
        [userId]: { url: data.loginUrl, expiry: data.expiresAt },
      }));
    } finally {
      setGeneratingFor(null);
    }
  }

  function handleCopyLink(userId: string) {
    const link = loginLinks[userId];
    if (!link) return;
    navigator.clipboard.writeText(link.url).then(() => {
      setCopiedUserId(userId);
      setTimeout(() => setCopiedUserId(null), 3000);
    });
  }

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Partner Users</h3>
        {!showForm && !editingUser && (
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg border border-[#1a3a5c] px-3 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white"
          >
            + Add User
          </button>
        )}
      </div>

      {showForm && !editingUser && (
        <div className="mb-4">
          <UserForm
            partnerAccountId={partnerAccountId}
            editUser={null}
            onSaved={handleUserSaved}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400">Loading users…</p>
      ) : loadError ? (
        <p className="text-sm text-red-500">{loadError}</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-gray-400">No users yet.</p>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              {editingUser?.id === user.id ? (
                <UserForm
                  partnerAccountId={partnerAccountId}
                  editUser={editingUser}
                  onSaved={handleUserSaved}
                  onCancel={() => setEditingUser(null)}
                />
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-[#0d1b2e]">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge label={user.role} colorClass="bg-indigo-100 text-indigo-800" />
                        <Badge
                          label={user.status}
                          colorClass={USER_STATUS_COLORS[user.status] ?? "bg-gray-100 text-gray-700"}
                        />
                      </div>
                    </div>
                    <div className="shrink-0 text-right space-y-0.5">
                      <p className="text-xs text-gray-400">Last login: {formatDate(user.last_login_at)}</p>
                      <p className="text-xs text-gray-400">Invited: {formatDate(user.invited_at)}</p>
                      <p className="text-xs text-gray-400">Accepted: {formatDate(user.accepted_at)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="rounded border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleGenerateLink(user.id)}
                      disabled={generatingFor === user.id}
                      className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white disabled:opacity-50"
                    >
                      {generatingFor === user.id ? "Generating…" : "Generate Login Link"}
                    </button>
                  </div>

                  {linkErrors[user.id] && (
                    <p className="text-xs text-red-600">{linkErrors[user.id]}</p>
                  )}

                  {loginLinks[user.id] && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1.5">
                      <p className="text-xs font-semibold text-amber-800">
                        One-time link — show once. Expires {formatDate(loginLinks[user.id].expiry)}.
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          readOnly
                          value={loginLinks[user.id].url}
                          className="flex-1 truncate rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-700"
                        />
                        <button
                          onClick={() => handleCopyLink(user.id)}
                          className="shrink-0 rounded bg-[#1a3a5c] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0d1b2e]"
                        >
                          {copiedUserId === user.id ? "Copied ✓" : "Copy"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Detail Modal ──────────────────────────────────────────────────────────────

function PartnerDetailModal({
  partner,
  onClose,
  onUpdated,
}: {
  partner: PartnerAccount;
  onClose: () => void;
  onUpdated: (updated: PartnerAccount) => void;
}) {
  const [editStatus, setEditStatus]   = useState<AccountStatus>(partner.status);
  const [editNotes, setEditNotes]     = useState(partner.internal_notes ?? "");
  const [saving, setSaving]           = useState(false);
  const [saveError, setSaveError]     = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [generatingLink, setGeneratingLink] = useState(false);
  const [loginUrl, setLoginUrl]             = useState<string | null>(null);
  const [loginExpiry, setLoginExpiry]       = useState<string | null>(null);
  const [linkError, setLinkError]           = useState<string | null>(null);
  const [copied, setCopied]                 = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editStatus, internal_notes: editNotes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save changes.");
        return;
      }
      setSaveSuccess(true);
      onUpdated({ ...partner, status: editStatus, internal_notes: editNotes });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGenerateAccountLink() {
    setGeneratingLink(true);
    setLinkError(null);
    setLoginUrl(null);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}/generate-login-link`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLinkError(data.error ?? "Failed to generate login link.");
        return;
      }
      setLoginUrl(data.loginUrl);
      setLoginExpiry(data.expiresAt);
    } catch {
      setLinkError("Network error. Please try again.");
    } finally {
      setGeneratingLink(false);
    }
  }

  function handleCopy() {
    if (!loginUrl) return;
    navigator.clipboard.writeText(loginUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-[#0d1b2e]">{partner.firm_name}</h2>
            <p className="text-sm text-gray-500">
              {partner.contact_first_name} {partner.contact_last_name} · {partner.email}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {/* Profile */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Profile</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <PrefRow label="Firm Name"        value={partner.firm_name} />
              <PrefRow label="Contact Name"     value={`${partner.contact_first_name} ${partner.contact_last_name}`} />
              <PrefRow label="Email"            value={partner.email} />
              <PrefRow label="Phone"            value={partner.phone} />
              <PrefRow label="Website"          value={partner.website} />
              <PrefRow label="States Served"    value={partner.states_served} />
              <PrefRow label="Routing States"   value={(partner.routing_states ?? []).join(", ") || "—"} />
              <PrefRow label="Practice Area"    value={partner.practice_area} />
              <PrefRow label="Monthly Capacity" value={partner.monthly_lead_capacity} />
              <PrefRow label="Last Login"       value={formatDateTime(partner.last_login_at)} />
              <PrefRow label="Created"          value={formatDate(partner.created_at)} />
            </div>
          </section>

          {/* Billing Contact */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Billing Contact</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <PrefRow label="Billing Name"     value={partner.billing_contact_name ?? "—"} />
              <PrefRow label="Billing Email"    value={partner.billing_contact_email ?? "—"} />
              <PrefRow label="Billing Phone"    value={partner.billing_contact_phone ?? "—"} />
              <PrefRow label="Address Line 1"   value={partner.billing_address_line1 ?? "—"} />
              <PrefRow label="Address Line 2"   value={partner.billing_address_line2 ?? "—"} />
              <PrefRow label="City"             value={partner.billing_city ?? "—"} />
              <PrefRow label="State"            value={partner.billing_state ?? "—"} />
              <PrefRow label="ZIP"              value={partner.billing_zip ?? "—"} />
              <PrefRow label="Profile Updated"  value={formatDateTime(partner.profile_updated_at ?? null)} />
              <PrefRow label="Billing Notes"    value={partner.billing_notes ?? "—"} />
            </div>
          </section>

          {/* Account Settings */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Account Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AccountStatus)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {ACCOUNT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Internal Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder="Internal admin notes (not visible to partner)"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {saveError   && <p className="text-sm text-red-600">{saveError}</p>}
              {saveSuccess && <p className="text-sm text-green-600">Changes saved.</p>}
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </section>

          {/* Lead Preferences (read-only) */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Lead Preferences</h3>
            <div className="space-y-2">
              <PrefRow label="Accepting Leads"  value={partner.accepting_leads == null ? "—" : partner.accepting_leads ? "Yes" : "No"} />
              <PrefRow label="Lead Status"      value={partner.lead_status ?? "—"} />
              <PrefRow label="Routing States"   value={(partner.routing_states ?? []).join(", ") || "—"} />
              <PrefRow label="Benefit Programs" value={(partner.accepted_case_types ?? []).join(", ") || "—"} />
              <PrefRow label="Initial Filings"  value={partner.accepts_initial_filings == null ? "—" : partner.accepts_initial_filings ? "Yes" : "No"} />
              <PrefRow label="Appeals"          value={partner.accepts_appeals == null ? "—" : partner.accepts_appeals ? "Yes" : "No"} />
              <PrefRow label="Hearings"         value={partner.accepts_hearings == null ? "—" : partner.accepts_hearings ? "Yes" : "No"} />
              <PrefRow label="Child Disability" value={partner.accepts_child_cases == null ? "—" : partner.accepts_child_cases ? "Yes" : "No"} />
              <PrefRow label="Languages"        value={(partner.accepted_languages ?? []).join(", ") || "—"} />
              <PrefRow label="Lead Notes"       value={partner.lead_notes ?? "—"} />
            </div>
          </section>

          {/* Partner Users */}
          <PartnerUsersSection partnerAccountId={partner.id} />

          {/* Account-Level Login Link (legacy) */}
          <section>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Account-Level Login Link
              <span className="ml-2 text-xs font-normal normal-case text-gray-400">
                (use user login links above when possible)
              </span>
            </h3>
            <button
              onClick={handleGenerateAccountLink}
              disabled={generatingLink}
              className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generatingLink ? "Generating…" : "Generate Account Login Link"}
            </button>

            {linkError && <p className="mt-2 text-sm text-red-600">{linkError}</p>}

            {loginUrl && (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
                <p className="text-xs font-semibold text-amber-800">
                  One-time link — show to partner once. Expires {loginExpiry ? formatDate(loginExpiry) : "in 7 days"}.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={loginUrl}
                    className="flex-1 truncate rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-700"
                  />
                  <button
                    onClick={handleCopy}
                    className="shrink-0 rounded bg-[#1a3a5c] px-3 py-1 text-xs font-semibold text-white hover:bg-[#0d1b2e]"
                  >
                    {copied ? "Copied ✓" : "Copy"}
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPartnersPage() {
  const router = useRouter();

  const [partners, setPartners]                 = useState<PartnerAccount[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [loadError, setLoadError]               = useState<string | null>(null);
  const [search, setSearch]                     = useState("");
  const [statusFilter, setStatusFilter]         = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState("");
  const [acceptingFilter, setAcceptingFilter]   = useState("");
  const [selectedPartner, setSelectedPartner]   = useState<PartnerAccount | null>(null);

  const [loginRequests, setLoginRequests]       = useState<LoginRequest[]>([]);
  const [loginReqLoading, setLoginReqLoading]   = useState(true);
  const [loginReqError, setLoginReqError]       = useState<string | null>(null);
  const [updatingReqId, setUpdatingReqId]       = useState<string | null>(null);

  // Per-request user login link generation
  const [reqLinkGenerating, setReqLinkGenerating] = useState<string | null>(null);
  const [reqLinks, setReqLinks]                   = useState<Record<string, { url: string; expiry: string }>>({});
  const [reqLinkErrors, setReqLinkErrors]         = useState<Record<string, string>>({});
  const [reqLinkCopied, setReqLinkCopied]         = useState<string | null>(null);

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const params = new URLSearchParams();
    if (search)           params.set("search", search);
    if (statusFilter)     params.set("status", statusFilter);
    if (leadStatusFilter) params.set("lead_status", leadStatusFilter);
    if (acceptingFilter)  params.set("accepting_leads", acceptingFilter);

    try {
      const res = await fetch(`/api/admin/partners?${params.toString()}`);
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoadError(data.error ?? "Failed to load partners."); return; }
      setPartners(data.data ?? []);
    } catch {
      setLoadError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, leadStatusFilter, acceptingFilter, router]);

  useEffect(() => { fetchPartners(); }, [fetchPartners]);

  const fetchLoginRequests = useCallback(async () => {
    setLoginReqLoading(true);
    setLoginReqError(null);
    try {
      const res = await fetch("/api/admin/login-requests?limit=30");
      if (res.status === 401) { router.push("/admin/login"); return; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setLoginReqError(data.error ?? "Failed to load login requests."); return; }
      setLoginRequests(data.data ?? []);
    } catch {
      setLoginReqError("Network error.");
    } finally {
      setLoginReqLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchLoginRequests(); }, [fetchLoginRequests]);

  async function updateLoginRequestStatus(id: string, status: "completed" | "dismissed") {
    setUpdatingReqId(id);
    try {
      const res = await fetch(`/api/admin/login-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setLoginRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      }
    } finally {
      setUpdatingReqId(null);
    }
  }

  async function openDetail(partner: PartnerAccount) {
    setSelectedPartner(partner);
    try {
      const res = await fetch(`/api/admin/partners/${partner.id}`);
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.data) setSelectedPartner(data.data as PartnerAccount);
    } catch {
      // use list data as fallback
    }
  }

  async function generateUserLinkForRequest(req: LoginRequest) {
    if (!req.partner_user_id) return;
    const userId = req.partner_user_id;
    setReqLinkGenerating(req.id);
    setReqLinkErrors((prev) => ({ ...prev, [req.id]: "" }));
    try {
      const res = await fetch(`/api/admin/partner-users/${userId}/generate-login-link`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setReqLinkErrors((prev) => ({ ...prev, [req.id]: data.error ?? "Failed to generate link." }));
        return;
      }
      setReqLinks((prev) => ({ ...prev, [req.id]: { url: data.loginUrl, expiry: data.expiresAt } }));
    } finally {
      setReqLinkGenerating(null);
    }
  }

  function copyReqLink(reqId: string) {
    const link = reqLinks[reqId];
    if (!link) return;
    navigator.clipboard.writeText(link.url).then(() => {
      setReqLinkCopied(reqId);
      setTimeout(() => setReqLinkCopied(null), 3000);
    });
  }

  async function openDetailFromRequest(req: LoginRequest) {
    if (!req.partner_account_id) return;
    const found = partners.find((p) => p.id === req.partner_account_id);
    if (found) {
      openDetail(found);
    } else {
      try {
        const res = await fetch(`/api/admin/partners/${req.partner_account_id}`);
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.data) setSelectedPartner(data.data as PartnerAccount);
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
            <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
            <a href="/admin/partners" className="text-sm font-semibold text-[#1a3a5c]">Partner Accounts</a>
            <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Lead Queue</a>
            <a href="/admin/notifications" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Notifications</a>
            <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
            <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
            <a href="/admin/billing/statements" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Statements</a>
            <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
          </div>
          <form action="/api/admin/logout" method="POST">
            <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
          </form>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Partner Accounts</h1>
          <p className="mt-1 text-sm text-gray-500">Manage all approved partner accounts and their users.</p>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search firm, name, or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Account Statuses</option>
            {ACCOUNT_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select
            value={leadStatusFilter}
            onChange={(e) => setLeadStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All Lead Statuses</option>
            {LEAD_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
          <select
            value={acceptingFilter}
            onChange={(e) => setAcceptingFilter(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Accepting Leads: All</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
          <button
            onClick={fetchPartners}
            className="rounded-lg bg-[#1a3a5c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e]"
          >
            Search
          </button>
        </div>

        {/* Partners Table */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">Loading…</div>
          ) : loadError ? (
            <div className="flex items-center justify-center py-16 text-sm text-red-500">{loadError}</div>
          ) : partners.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-sm text-gray-400">No partner accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-4 py-3 text-left">Firm Name</th>
                    <th className="px-4 py-3 text-left">Contact</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">States</th>
                    <th className="px-4 py-3 text-left">Practice Area</th>
                    <th className="px-4 py-3 text-left">Capacity</th>
                    <th className="px-4 py-3 text-left">Account Status</th>
                    <th className="px-4 py-3 text-left">Lead Status</th>
                    <th className="px-4 py-3 text-left">Accepting</th>
                    <th className="px-4 py-3 text-left">Last Login</th>
                    <th className="px-4 py-3 text-left">Created</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {partners.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-[#0d1b2e]">{p.firm_name}</td>
                      <td className="px-4 py-3 text-gray-700">{p.contact_first_name} {p.contact_last_name}</td>
                      <td className="px-4 py-3 text-gray-600">{p.email}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-[120px] truncate">{p.states_served ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{p.practice_area ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-600">{p.monthly_lead_capacity ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge label={p.status} colorClass={ACCOUNT_STATUS_COLORS[p.status] ?? "bg-gray-100 text-gray-700"} />
                      </td>
                      <td className="px-4 py-3">
                        {p.lead_status
                          ? <Badge label={p.lead_status} colorClass={LEAD_STATUS_COLORS[p.lead_status] ?? "bg-gray-100 text-gray-700"} />
                          : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {p.accepting_leads == null
                          ? <span className="text-gray-400">—</span>
                          : p.accepting_leads
                            ? <span className="text-green-700 font-medium">Yes</span>
                            : <span className="text-gray-500">No</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.last_login_at)}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(p.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(p)}
                          className="rounded-lg border border-[#1a3a5c] px-3 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white"
                        >
                          View / Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Login Requests */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#0d1b2e]">Recent Login Requests</h2>
            <button onClick={fetchLoginRequests} className="text-xs text-blue-600 hover:underline">
              Refresh
            </button>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {loginReqLoading ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-400">Loading…</div>
            ) : loginReqError ? (
              <div className="flex items-center justify-center py-10 text-sm text-red-500">{loginReqError}</div>
            ) : loginRequests.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-400">No login requests yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Email</th>
                      <th className="px-4 py-3 text-left">Requested</th>
                      <th className="px-4 py-3 text-left">Matched</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loginRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-700">{req.email}</td>
                        <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDateTime(req.created_at)}</td>
                        <td className="px-4 py-3 text-xs">
                          {req.partner_user_id
                            ? <span className="text-green-700 font-medium">User matched</span>
                            : req.partner_account_id
                              ? <span className="text-yellow-700">Account only</span>
                              : <span className="text-gray-400">No match</span>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            label={req.status}
                            colorClass={LOGIN_REQUEST_STATUS_COLORS[req.status] ?? "bg-gray-100 text-gray-700"}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              {/* User-matched: generate user-specific link directly */}
                              {req.partner_user_id && (
                                <button
                                  onClick={() => generateUserLinkForRequest(req)}
                                  disabled={reqLinkGenerating === req.id}
                                  className="rounded border border-[#1a3a5c] px-2 py-1 text-xs font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white disabled:opacity-50"
                                >
                                  {reqLinkGenerating === req.id ? "Generating…" : "Generate User Link"}
                                </button>
                              )}
                              {/* Open account (always shown when account is known) */}
                              {req.partner_account_id && (
                                <button
                                  onClick={() => openDetailFromRequest(req)}
                                  className="rounded border border-gray-400 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-100"
                                >
                                  Open Account
                                </button>
                              )}
                              {req.status !== "completed" && (
                                <button
                                  onClick={() => updateLoginRequestStatus(req.id, "completed")}
                                  disabled={updatingReqId === req.id}
                                  className="rounded border border-green-600 px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-600 hover:text-white disabled:opacity-50"
                                >
                                  Mark Complete
                                </button>
                              )}
                              {req.status !== "dismissed" && (
                                <button
                                  onClick={() => updateLoginRequestStatus(req.id, "dismissed")}
                                  disabled={updatingReqId === req.id}
                                  className="rounded border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                                >
                                  Dismiss
                                </button>
                              )}
                            </div>
                            {/* Inline error for link generation */}
                            {reqLinkErrors[req.id] && (
                              <p className="text-xs text-red-600">{reqLinkErrors[req.id]}</p>
                            )}
                            {/* Generated user link — show once */}
                            {reqLinks[req.id] && (
                              <div className="rounded border border-amber-200 bg-amber-50 p-2 space-y-1">
                                <p className="text-xs font-semibold text-amber-800">
                                  One-time link — expires {formatDate(reqLinks[req.id].expiry)}
                                </p>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    readOnly
                                    value={reqLinks[req.id].url}
                                    className="flex-1 truncate rounded border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-700"
                                  />
                                  <button
                                    onClick={() => copyReqLink(req.id)}
                                    className="shrink-0 rounded bg-[#1a3a5c] px-2 py-1 text-xs font-semibold text-white hover:bg-[#0d1b2e]"
                                  >
                                    {reqLinkCopied === req.id ? "Copied ✓" : "Copy"}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedPartner && (
        <PartnerDetailModal
          partner={selectedPartner}
          onClose={() => setSelectedPartner(null)}
          onUpdated={(updated) => {
            setPartners((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
            setSelectedPartner(updated);
          }}
        />
      )}
    </div>
  );
}
