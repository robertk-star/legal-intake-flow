"use client";

import { useEffect, useState } from "react";

type CheckStatus = "ok" | "review" | "missing";

type SecurityCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

type SecurityResponse = {
  generatedAt: string;
  summary: { ok: number; review: number; missing: number };
  checks: SecurityCheck[];
};

const STATUS_STYLES: Record<CheckStatus, string> = {
  ok: "border-green-200 bg-green-50 text-green-800",
  review: "border-yellow-200 bg-yellow-50 text-yellow-800",
  missing: "border-red-200 bg-red-50 text-red-800",
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  ok: "OK",
  review: "Needs Review",
  missing: "Action Required",
};

export default function SecurityDashboard() {
  const [data, setData] = useState<SecurityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/security");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error ?? "Failed to load security check.");
        return;
      }
      setData(json);
    } catch {
      setError("Network error loading security check.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {loading && <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">Loading security checks…</div>}
      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SummaryCard label="OK" value={data.summary.ok} tone="green" />
            <SummaryCard label="Needs Review" value={data.summary.review} tone="yellow" />
            <SummaryCard label="Action Required" value={data.summary.missing} tone="red" />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-[#0d1b2e]">Security Hardening Checklist</h2>
              <p className="mt-1 text-xs text-gray-400">Last checked {new Date(data.generatedAt).toLocaleString()}</p>
            </div>
            <div className="divide-y divide-gray-100">
              {data.checks.map((check) => (
                <div key={check.key} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{check.label}</h3>
                    <p className="mt-1 text-sm text-gray-500">{check.detail}</p>
                  </div>
                  <span className={`inline-flex shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[check.status]}`}>
                    {STATUS_LABELS[check.status]}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            <strong>Note:</strong> Built-in rate limiting is best-effort and per runtime instance. For high traffic, add edge/WAF rate limiting at Vercel or Cloudflare too.
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "green" | "yellow" | "red" }) {
  const tones = {
    green: "border-green-200 bg-green-50 text-green-800",
    yellow: "border-yellow-200 bg-yellow-50 text-yellow-800",
    red: "border-red-200 bg-red-50 text-red-800",
  };
  return (
    <div className={`rounded-xl border p-5 shadow-sm ${tones[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
