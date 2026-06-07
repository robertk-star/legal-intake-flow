"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CheckStatus = "pass" | "warning" | "fail";

type SystemCheckItem = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

type SystemCheckSection = {
  key: string;
  title: string;
  status: CheckStatus;
  items: SystemCheckItem[];
};

type SystemCheckResponse = {
  success: boolean;
  checkedAt: string;
  overall: CheckStatus;
  sections: SystemCheckSection[];
};

const STATUS_LABELS: Record<CheckStatus, string> = {
  pass: "OK",
  warning: "Needs Review",
  fail: "Action Required",
};

const STATUS_CLASSES: Record<CheckStatus, string> = {
  pass: "bg-green-100 text-green-800 border-green-200",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-200",
  fail: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_DOT: Record<CheckStatus, string> = {
  pass: "bg-green-500",
  warning: "bg-yellow-500",
  fail: "bg-red-500",
};

function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function SectionCard({ section }: { section: SystemCheckSection }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-[#0d1b2e]">{section.title}</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {section.items.length} check{section.items.length !== 1 ? "s" : ""}
          </p>
        </div>
        <StatusBadge status={section.status} />
      </div>
      <div className="divide-y divide-gray-100">
        {section.items.map((item) => (
          <div key={item.key} className="grid grid-cols-1 gap-2 px-5 py-4 sm:grid-cols-[220px_140px_1fr] sm:items-start">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[item.status]}`} />
              <span className="text-sm font-medium text-gray-900">{item.label}</span>
            </div>
            <div>
              <StatusBadge status={item.status} />
            </div>
            <p className="text-sm text-gray-600">{item.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function SystemCheckClient() {
  const router = useRouter();
  const [data, setData] = useState<SystemCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchChecks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/system-check", { cache: "no-store" });
      if (res.status === 401) {
        router.push("/admin/login");
        return;
      }
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(payload.error ?? "Failed to load system check.");
        return;
      }
      setData(payload as SystemCheckResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchChecks();
  }, [fetchChecks]);

  const totals = useMemo(() => {
    const counts: Record<CheckStatus, number> = { pass: 0, warning: 0, fail: 0 };
    for (const section of data?.sections ?? []) {
      for (const item of section.items) counts[item.status] += 1;
    }
    return counts;
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[#0d1b2e]">Production System Check</h2>
            <p className="mt-1 text-sm text-gray-500">
              Confirms required environment variables, database tables/columns, and current LIF production safety assumptions.
            </p>
            {data?.checkedAt && (
              <p className="mt-2 text-xs text-gray-400">Last checked {formatDateTime(data.checkedAt)}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {data && <StatusBadge status={data.overall} />}
            <button
              onClick={fetchChecks}
              disabled={loading}
              className="rounded-lg border border-[#1a3a5c] px-4 py-2 text-sm font-semibold text-[#1a3a5c] transition hover:bg-[#1a3a5c] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center text-sm text-gray-400 shadow-sm">
          Loading system checks…
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-green-200 bg-green-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-green-700">OK</p>
              <p className="mt-1 text-2xl font-bold text-green-900">{totals.pass}</p>
            </div>
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-yellow-700">Needs Review</p>
              <p className="mt-1 text-2xl font-bold text-yellow-900">{totals.warning}</p>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-700">Action Required</p>
              <p className="mt-1 text-2xl font-bold text-red-900">{totals.fail}</p>
            </div>
          </div>

          {data.sections.map((section) => (
            <SectionCard key={section.key} section={section} />
          ))}
        </>
      )}
    </div>
  );
}
