import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type CheckStatus = "ok" | "review" | "missing";

type SecurityCheck = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

function configured(name: string) {
  return Boolean(process.env[name]?.trim());
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const checks: SecurityCheck[] = [
    {
      key: "admin_secret",
      label: "Admin session secret",
      status: configured("LIF_ADMIN_SESSION_SECRET") ? "ok" : "review",
      detail: configured("LIF_ADMIN_SESSION_SECRET")
        ? "Dedicated admin signing secret is configured."
        : "Admin auth falls back to LIF_ADMIN_PASSWORD. Add LIF_ADMIN_SESSION_SECRET for stronger separation.",
    },
    {
      key: "partner_secret",
      label: "Partner session secret",
      status: configured("LIF_PARTNER_SESSION_SECRET") ? "ok" : "missing",
      detail: configured("LIF_PARTNER_SESSION_SECRET")
        ? "Partner session signing secret is configured."
        : "Partner sessions require LIF_PARTNER_SESSION_SECRET.",
    },
    {
      key: "dbs_ingest_secret",
      label: "DBS ingest secret",
      status: configured("LIF_DBS_INGEST_SECRET") ? "ok" : "missing",
      detail: configured("LIF_DBS_INGEST_SECRET")
        ? "DBS lead ingestion is protected by a shared secret."
        : "DBS ingestion requires LIF_DBS_INGEST_SECRET.",
    },
    {
      key: "stripe_webhook_secret",
      label: "Stripe webhook secret",
      status: configured("STRIPE_WEBHOOK_SECRET") ? "ok" : "review",
      detail: configured("STRIPE_WEBHOOK_SECRET")
        ? "Stripe webhook signature verification is configured."
        : "Only required if Stripe payments are enabled.",
    },
    {
      key: "rate_limits",
      label: "Best-effort API rate limits",
      status: process.env.LIF_RATE_LIMIT_DISABLED?.trim().toLowerCase() === "true" ? "review" : "ok",
      detail: process.env.LIF_RATE_LIMIT_DISABLED?.trim().toLowerCase() === "true"
        ? "Rate limiting is explicitly disabled by LIF_RATE_LIMIT_DISABLED=true."
        : "Sensitive routes use best-effort per-IP rate limiting.",
    },
    {
      key: "security_headers",
      label: "Security headers middleware",
      status: "ok",
      detail: "Middleware adds no-sniff, frame blocking, referrer policy, permissions policy, and noindex headers for admin/partner pages.",
    },
    {
      key: "public_intake",
      label: "Public LIF intake disabled",
      status: "ok",
      detail: "LIF remains partner/admin focused. Public claimant intake stays in DBS.",
    },
  ];

  const summary = {
    ok: checks.filter((check) => check.status === "ok").length,
    review: checks.filter((check) => check.status === "review").length,
    missing: checks.filter((check) => check.status === "missing").length,
  };

  return NextResponse.json({ success: true, generatedAt: new Date().toISOString(), summary, checks });
}
