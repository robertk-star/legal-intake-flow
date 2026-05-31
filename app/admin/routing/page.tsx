"use client";

import { useCallback, useEffect, useState } from "react";

type RoutingSettings = {
  id: string;
  auto_assignment_enabled: boolean;
  auto_assign_new_dbs_leads: boolean;
  notify_partner_on_auto_assignment: boolean;
  require_no_blockers: boolean;
  minimum_score: number;
  updated_at: string | null;
  updated_by: string | null;
  notes: string | null;
};

type BatchResult = {
  scanned: number;
  assigned: number;
  skipped: number;
  results: Array<{
    leadId: string;
    assigned: boolean;
    skipped?: boolean;
    reason?: string;
    partnerAccountId?: string | null;
    score?: number;
  }>;
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

function AdminNav() {
  return (
    <nav className="border-b border-gray-200 bg-white px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-5">
          <span className="text-sm font-bold text-[#0d1b2e]">Legal Intake Flow Admin</span>
          <a href="/admin" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Dashboard</a>
          <a href="/admin/partner-requests" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partner Requests</a>
          <a href="/admin/partners" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Partners</a>
          <a href="/admin/leads" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Leads</a>
          <a href="/admin/routing" className="text-sm font-semibold text-[#1a3a5c]">Routing</a>
          <a href="/admin/billing" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Billing</a>
          <a href="/admin/reports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Reports</a>
          <a href="/admin/activity" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Activity</a>
          <a href="/admin/exports" className="text-sm text-gray-500 hover:text-[#0d1b2e]">Exports</a>
          <a href="/admin/system-check" className="text-sm text-gray-500 hover:text-[#0d1b2e]">System Check</a>
        </div>
        <form action="/api/admin/logout" method="POST">
          <button type="submit" className="text-xs text-gray-400 hover:text-gray-600">Sign Out</button>
        </form>
      </div>
    </nav>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-white p-4">
      <span>
        <span className="block text-sm font-semibold text-[#0d1b2e]">{label}</span>
        <span className="mt-1 block text-sm text-gray-500">{description}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-5 w-5 rounded border-gray-300 text-[#1a3a5c] focus:ring-[#1a3a5c]"
      />
    </label>
  );
}

export default function AdminRoutingPage() {
  const [settings, setSettings] = useState<RoutingSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/admin/routing-settings");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoadError(data.error ?? "Failed to load routing settings.");
        return;
      }
      setSettings(data.data);
      if (data.warning) setLoadError(data.warning);
    } catch {
      setLoadError("Network error loading routing settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function update<K extends keyof RoutingSettings>(key: K, value: RoutingSettings[K]) {
    setSettings((current) => current ? { ...current, [key]: value } : current);
  }

  async function saveSettings() {
    if (!settings) return;
    setSaving(true);
    setSaveMessage(null);
    setSaveError(null);
    try {
      const res = await fetch("/api/admin/routing-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error ?? "Failed to save routing settings.");
        return;
      }
      setSettings(data.data);
      setSaveMessage("Routing controls saved.");
    } catch {
      setSaveError("Network error saving routing settings.");
    } finally {
      setSaving(false);
    }
  }

  async function runBatch() {
    setRunning(true);
    setBatchError(null);
    setBatchResult(null);
    try {
      const res = await fetch("/api/admin/leads/auto-assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 25 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setBatchError(data.error ?? "Failed to run assignment automation.");
        return;
      }
      setBatchResult(data as BatchResult);
    } catch {
      setBatchError("Network error running assignment automation.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0d1b2e]">Routing Controls</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure controlled lead assignment automation. Manual assignment and best-match preview remain available.
          </p>
        </div>

        {loading && <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">Loading routing controls…</div>}
        {loadError && <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">{loadError}</div>}

        {settings && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-[#0d1b2e]">Auto-Assignment Settings</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Defaults are intentionally conservative. Keep automation off until routing data and partner capacity are ready.
                </p>
              </div>

              <div className="space-y-3">
                <Toggle
                  label="Enable auto-assignment controls"
                  description="Allows batch assignment and DBS-ingest auto-assignment when the specific controls below are enabled."
                  checked={settings.auto_assignment_enabled}
                  onChange={(value) => update("auto_assignment_enabled", value)}
                />
                <Toggle
                  label="Auto-assign newly ingested DBS leads"
                  description="When enabled, new DBS leads are assigned to the best eligible partner immediately after ingestion."
                  checked={settings.auto_assign_new_dbs_leads}
                  onChange={(value) => update("auto_assign_new_dbs_leads", value)}
                />
                <Toggle
                  label="Send partner assignment emails during automation"
                  description="Uses existing lead assignment email notifications when automation assigns a lead."
                  checked={settings.notify_partner_on_auto_assignment}
                  onChange={(value) => update("notify_partner_on_auto_assignment", value)}
                />
                <Toggle
                  label="Require zero blockers"
                  description="Only assign partners that pass every routing rule without blockers."
                  checked={settings.require_no_blockers}
                  onChange={(value) => update("require_no_blockers", value)}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Minimum score</span>
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    value={settings.minimum_score}
                    onChange={(event) => update("minimum_score", Number(event.target.value))}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  />
                </label>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-500">
                  <p><strong>Last updated:</strong> {formatDateTime(settings.updated_at)}</p>
                  <p><strong>Updated by:</strong> {settings.updated_by ?? "—"}</p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Internal routing notes</span>
                <textarea
                  rows={3}
                  value={settings.notes ?? ""}
                  onChange={(event) => update("notes", event.target.value)}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1a3a5c]"
                  placeholder="Optional notes about current automation policy."
                />
              </label>

              {saveError && <p className="mt-3 text-sm text-red-600">{saveError}</p>}
              {saveMessage && <p className="mt-3 text-sm text-green-700">{saveMessage}</p>}

              <button
                onClick={saveSettings}
                disabled={saving}
                className="mt-5 rounded-lg bg-[#1a3a5c] px-5 py-2 text-sm font-semibold text-white hover:bg-[#0d1b2e] disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Routing Controls"}
              </button>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[#0d1b2e]">Run Assignment Automation</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Assign up to 25 currently unassigned leads using the best-match engine. This requires auto-assignment controls to be enabled.
                  </p>
                </div>
                <button
                  onClick={runBatch}
                  disabled={running || !settings.auto_assignment_enabled}
                  className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] hover:bg-[#1a3a5c] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {running ? "Running…" : "Run Now"}
                </button>
              </div>

              {batchError && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{batchError}</p>}
              {batchResult && (
                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-[#0d1b2e]">
                    Scanned {batchResult.scanned} leads. Assigned {batchResult.assigned}. Skipped {batchResult.skipped}.
                  </p>
                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {batchResult.results.map((result) => (
                      <div key={result.leadId} className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-600">
                        <p className="font-mono text-gray-500">{result.leadId}</p>
                        {result.assigned ? (
                          <p className="mt-1 text-green-700">Assigned to {result.partnerAccountId} · Score {result.score ?? "—"}</p>
                        ) : (
                          <p className="mt-1 text-yellow-700">Skipped: {result.reason ?? "No reason provided."}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
