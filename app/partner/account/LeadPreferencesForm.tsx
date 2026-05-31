"use client";

import { useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LeadPreferences {
  accepting_leads:         boolean;
  lead_status:             "active" | "paused" | "at_capacity";
  monthly_lead_capacity:   string;
  routing_states:          string[];
  accepted_case_types:     string[];
  accepted_languages:      string[];
  accepts_initial_filings: boolean;
  accepts_appeals:         boolean;
  accepts_hearings:        boolean;
  accepts_child_cases:     boolean;
  lead_notes:              string | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** SSDI/SSI case-type tags stored in the accepted_case_types text[] column */
const CASE_TYPE_OPTIONS = [
  { value: "SSDI", label: "SSDI (Social Security Disability Insurance)" },
  { value: "SSI",  label: "SSI (Supplemental Security Income)" },
] as const;

const LANGUAGE_OPTIONS = [
  { value: "English", label: "English" },
  { value: "Spanish", label: "Spanish" },
] as const;

const LEAD_STATUS_OPTIONS = [
  { value: "active",      label: "Active" },
  { value: "paused",      label: "Paused" },
  { value: "at_capacity", label: "At Capacity" },
] as const;

function normalizeRoutingStates(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(/[,;\n|/]+/)
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    )
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadPreferencesForm({
  initialPreferences,
}: {
  initialPreferences: LeadPreferences;
}) {
  const [prefs, setPrefs] = useState<LeadPreferences>({
    ...initialPreferences,
    routing_states:      initialPreferences.routing_states      ?? [],
    accepted_case_types: initialPreferences.accepted_case_types ?? [],
    accepted_languages:  initialPreferences.accepted_languages  ?? [],
    lead_notes:          initialPreferences.lead_notes          ?? "",
  });

  const [routingStatesText, setRoutingStatesText] = useState(
    (initialPreferences.routing_states ?? []).join(", ")
  );

  const [saving,  setSaving]  = useState(false);
  const [success, setSuccess] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleArrayValue(
    key: "accepted_case_types" | "accepted_languages",
    value: string
  ) {
    setPrefs((prev) => {
      const current = prev[key] ?? [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
    setSuccess(false);
  }

  function setField<K extends keyof LeadPreferences>(key: K, value: LeadPreferences[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
    setSuccess(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    setSuccess(false);
    setError(null);

    try {
      const res = await fetch("/api/partner/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prefs,
          routing_states: normalizeRoutingStates(routingStatesText),
          lead_notes: prefs.lead_notes?.trim() || null,
        }),
      });

      let data: { success: boolean; error?: string; details?: string[] };
      try {
        data = await res.json();
      } catch {
        setError(`Server returned an unexpected response (HTTP ${res.status}).`);
        return;
      }

      if (data.success) {
        setSuccess(true);
      } else {
        const detail = data.details?.join(" ") ?? "";
        setError(data.error ? `${data.error}${detail ? " " + detail : ""}` : "Failed to save preferences.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Card header */}
      <div className="border-b border-gray-100 px-6 py-4">
        <h2 className="text-base font-semibold text-[#0d1b2e]">Lead Preferences</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Configure the types of leads you want to receive. These settings will be used when lead routing goes live.
        </p>
      </div>

      <div className="space-y-8 px-6 py-6">

        {/* ── Lead Status ─────────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Lead Status
          </legend>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            {/* Accepting New Leads toggle */}
            <div className="sm:col-span-3 flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-gray-800">Accepting New Leads</p>
                <p className="text-xs text-gray-500 mt-0.5">Turn off to pause all new lead delivery.</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.accepting_leads}
                onClick={() => setField("accepting_leads", !prefs.accepting_leads)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#1a3a8f] focus:ring-offset-2 ${
                  prefs.accepting_leads ? "bg-green-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${
                    prefs.accepting_leads ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Lead Status dropdown */}
            <div className="sm:col-span-2">
              <label htmlFor="lead_status" className="block text-xs font-medium text-gray-600 mb-1.5">
                Lead Status
              </label>
              <select
                id="lead_status"
                value={prefs.lead_status}
                onChange={(e) => setField("lead_status", e.target.value as LeadPreferences["lead_status"])}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#1a3a8f] focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
              >
                {LEAD_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Monthly Lead Capacity */}
            <div>
              <label htmlFor="monthly_lead_capacity" className="block text-xs font-medium text-gray-600 mb-1.5">
                Monthly Lead Capacity
              </label>
              <input
                id="monthly_lead_capacity"
                type="text"
                value={prefs.monthly_lead_capacity}
                onChange={(e) => setField("monthly_lead_capacity", e.target.value)}
                placeholder="e.g. 20"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm focus:border-[#1a3a8f] focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
              />
            </div>
          </div>
        </fieldset>

        {/* ── Routing States ───────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            States Accepted for Routing
          </legend>
          <p className="text-xs text-gray-500 mb-3">
            Enter two-letter state abbreviations separated by commas. These are used for admin routing previews before automatic routing is built.
          </p>
          <input
            type="text"
            value={routingStatesText}
            onChange={(e) => {
              setRoutingStatesText(e.target.value);
              setSuccess(false);
            }}
            placeholder="e.g. TX, FL, GA"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#1a3a8f] focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Current routing states: {normalizeRoutingStates(routingStatesText).join(", ") || "None configured"}
          </p>
        </fieldset>

        {/* ── Case Types (SSDI / SSI) ──────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Benefit Programs Accepted
          </legend>
          <p className="text-xs text-gray-500 mb-4">Select the Social Security programs you accept cases for.</p>
          <div className="space-y-2.5">
            {CASE_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(prefs.accepted_case_types ?? []).includes(opt.value)}
                  onChange={() => toggleArrayValue("accepted_case_types", opt.value)}
                  className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Case Stage Preferences (boolean columns) ─────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
            Case Stages Accepted
          </legend>
          <p className="text-xs text-gray-500 mb-4">Select the stages of the disability process you handle.</p>
          <div className="space-y-2.5">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={prefs.accepts_initial_filings}
                onChange={() => setField("accepts_initial_filings", !prefs.accepts_initial_filings)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Initial Filings</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={prefs.accepts_appeals}
                onChange={() => setField("accepts_appeals", !prefs.accepts_appeals)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Appeals / Denials</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={prefs.accepts_hearings}
                onChange={() => setField("accepts_hearings", !prefs.accepts_hearings)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Hearings</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={prefs.accepts_child_cases}
                onChange={() => setField("accepts_child_cases", !prefs.accepts_child_cases)}
                className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">Child Disability Cases</span>
            </label>
          </div>
        </fieldset>

        {/* ── Languages ───────────────────────────────────────────────────── */}
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Languages
          </legend>
          <div className="space-y-2.5">
            {LANGUAGE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={(prefs.accepted_languages ?? []).includes(opt.value)}
                  onChange={() => toggleArrayValue("accepted_languages", opt.value)}
                  className="h-4 w-4 rounded border-gray-300 text-[#1a3a8f] focus:ring-[#1a3a8f]"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{opt.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Lead Notes ──────────────────────────────────────────────────── */}
        <div>
          <label htmlFor="lead_notes" className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">
            Lead Notes
          </label>
          <textarea
            id="lead_notes"
            rows={4}
            value={prefs.lead_notes ?? ""}
            onChange={(e) => setField("lead_notes", e.target.value)}
            placeholder="e.g. Only accepting Texas claimants. Appeals preferred. Spanish-speaking intake preferred."
            className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm text-gray-800 shadow-sm placeholder:text-gray-400 focus:border-[#1a3a8f] focus:outline-none focus:ring-1 focus:ring-[#1a3a8f]"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Internal use only. Used for routing preferences when lead delivery goes live.
          </p>
        </div>

        {/* ── Save button + feedback ───────────────────────────────────────── */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-md bg-[#1a3a8f] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#162e75] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : "Save Preferences"}
          </button>

          {success && (
            <p className="text-sm font-medium text-green-700">
              Preferences saved successfully.
            </p>
          )}

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </div>

      </div>
    </div>
  );
}
