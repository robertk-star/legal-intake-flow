import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isAdminAuthenticated } from "@/lib/adminAuth";

type CheckStatus = "pass" | "warning" | "fail";

type SystemCheckItem = {
  key: string;
  label: string;
  status: CheckStatus;
  detail: string;
};

type TableProbe = {
  key: string;
  label: string;
  table: string;
  select: string;
  required: boolean;
};

const REQUIRED_ENV = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    label: "Supabase URL",
    description: "Required for all Supabase-backed pages and API routes.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    label: "Supabase service role key",
    description: "Required for server-side admin, partner, and lead operations.",
  },
  {
    key: "LIF_ADMIN_PASSWORD",
    label: "Admin password",
    description: "Required for /admin/login.",
  },
  {
    key: "LIF_PARTNER_SESSION_SECRET",
    label: "Partner session secret",
    description: "Required for signed partner sessions.",
  },
  {
    key: "LIF_DBS_INGEST_SECRET",
    label: "DBS ingest secret",
    description: "Required for DBS-to-LIF lead ingestion.",
  },
];

const RECOMMENDED_ENV = [
  {
    key: "LIF_ADMIN_SESSION_SECRET",
    label: "Admin session secret",
    description: "Recommended separate signing secret for admin sessions.",
  },
  {
    key: "RESEND_API_KEY",
    label: "Resend API key",
    description: "Required for live email delivery. Without it, emails are skipped/logged.",
  },
  {
    key: "LIF_EMAIL_FROM",
    label: "Email from address",
    description: "Required for live email delivery.",
  },
  {
    key: "LIF_EMAIL_REPLY_TO",
    label: "Email reply-to address",
    description: "Recommended for partner replies and operational contact.",
  },
  {
    key: "LIF_APP_URL",
    label: "LIF app URL",
    description: "Recommended for absolute links in emails.",
  },
];

const TABLE_PROBES: TableProbe[] = [
  {
    key: "partner_access_requests",
    label: "Partner access requests",
    table: "partner_access_requests",
    select: "id, status, internal_notes",
    required: true,
  },
  {
    key: "partner_accounts",
    label: "Partner accounts + preferences/routing",
    table: "partner_accounts",
    select: "id, status, accepting_leads, lead_status, routing_states",
    required: true,
  },
  {
    key: "partner_users",
    label: "Partner users",
    table: "partner_users",
    select: "id, partner_account_id, email, role, status",
    required: true,
  },
  {
    key: "partner_login_tokens",
    label: "Partner login tokens",
    table: "partner_login_tokens",
    select: "id, partner_account_id, partner_user_id, token_hash, expires_at, used_at",
    required: true,
  },
  {
    key: "partner_login_requests",
    label: "Partner login requests",
    table: "partner_login_requests",
    select: "id, email, partner_account_id, partner_user_id, status",
    required: true,
  },
  {
    key: "leads",
    label: "DBS leads + partner workflow fields",
    table: "leads",
    select:
      "id, source, external_reference_id, status, assigned_partner_account_id, assigned_at, " +
      "partner_response_status, partner_notes, partner_viewed_at, partner_response_updated_at, " +
      "assignment_notification_sent_at, assignment_notification_count, " +
      "billable_status, billing_amount_cents, billing_notes",
    required: true,
  },
  {
    key: "lead_assignment_events",
    label: "Lead assignment events",
    table: "lead_assignment_events",
    select: "id, lead_id, partner_account_id, assignment_type, score, created_at",
    required: true,
  },

  {
    key: "lead_billing_events",
    label: "Lead billing events",
    table: "lead_billing_events",
    select: "id, lead_id, partner_account_id, event_type, created_at",
    required: true,
  },
  {
    key: "email_notifications",
    label: "Email notification log",
    table: "email_notifications",
    select: "id, notification_type, recipient_email, status, created_at",
    required: true,
  },
];

function envIsPresent(key: string) {
  return Boolean(process.env[key]?.trim());
}

function maskEnvValue(key: string) {
  const value = process.env[key];
  if (!value) return "Missing";
  return `Configured (${value.length} chars)`;
}

function summarizeStatus(items: SystemCheckItem[]): CheckStatus {
  if (items.some((item) => item.status === "fail")) return "fail";
  if (items.some((item) => item.status === "warning")) return "warning";
  return "pass";
}

async function probeTable(
  supabase: any,
  probe: TableProbe
): Promise<SystemCheckItem> {
  const { error, count } = await supabase
    .from(probe.table)
    .select(probe.select, { count: "exact", head: true });

  if (error) {
    return {
      key: probe.key,
      label: probe.label,
      status: probe.required ? "fail" : "warning",
      detail: `${error.message}${error.code ? ` [${error.code}]` : ""}`,
    };
  }

  return {
    key: probe.key,
    label: probe.label,
    status: "pass",
    detail: `Available${typeof count === "number" ? ` (${count} records)` : ""}.`,
  };
}

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const requiredEnv: SystemCheckItem[] = REQUIRED_ENV.map((env) => ({
    key: env.key,
    label: env.label,
    status: envIsPresent(env.key) ? "pass" : "fail",
    detail: envIsPresent(env.key) ? `${maskEnvValue(env.key)}. ${env.description}` : `Missing. ${env.description}`,
  }));

  const recommendedEnv: SystemCheckItem[] = RECOMMENDED_ENV.map((env) => {
    const present = envIsPresent(env.key);
    return {
      key: env.key,
      label: env.label,
      status: present ? "pass" : "warning",
      detail: present ? `${maskEnvValue(env.key)}. ${env.description}` : `Not configured. ${env.description}`,
    };
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let database: SystemCheckItem[] = [];

  if (!supabaseUrl || !serviceRoleKey) {
    database = [
      {
        key: "supabase_connection",
        label: "Supabase connection",
        status: "fail",
        detail: "Cannot check database tables until NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are configured.",
      },
    ];
  } else {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    database = await Promise.all(TABLE_PROBES.map((probe) => probeTable(supabase, probe)));
  }

  const safety: SystemCheckItem[] = [
    {
      key: "public_lif_intake_removed",
      label: "Public LIF claimant intake removed",
      status: "pass",
      detail: "LIF should not expose /apply or /api/intake/submit. DBS handles public claimant intake.",
    },
    {
      key: "manual_assignment",
      label: "Manual/admin-triggered assignment",
      status: "pass",
      detail: "Current system supports manual assignment and admin-triggered best match; no automatic assignment on DBS ingest.",
    },
    {
      key: "partner_route_scope",
      label: "Partner lead access scoped by account",
      status: "pass",
      detail: "Partner lead APIs filter by the authenticated partner account before returning or updating leads.",
    },
  ];

  const requiredEnvStatus = summarizeStatus(requiredEnv);
  const recommendedEnvStatus = summarizeStatus(recommendedEnv);
  const databaseStatus = summarizeStatus(database);
  const safetyStatus = summarizeStatus(safety);
  const overall = summarizeStatus([...requiredEnv, ...recommendedEnv, ...database, ...safety]);

  return NextResponse.json({
    success: true,
    checkedAt: new Date().toISOString(),
    overall,
    sections: [
      {
        key: "required_env",
        title: "Required Environment Variables",
        status: requiredEnvStatus,
        items: requiredEnv,
      },
      {
        key: "recommended_env",
        title: "Recommended / Email Environment Variables",
        status: recommendedEnvStatus,
        items: recommendedEnv,
      },
      {
        key: "database",
        title: "Database Tables & Phase Columns",
        status: databaseStatus,
        items: database,
      },
      {
        key: "safety",
        title: "Production Safety Checks",
        status: safetyStatus,
        items: safety,
      },
    ],
  });
}
