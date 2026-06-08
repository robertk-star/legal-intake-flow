import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthenticatedPartnerSession, type PartnerRole } from "@/lib/partnerAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import PartnerLogoutButton from "../../account/LogoutButton";

interface PartnerAccountHeader {
  firm_name: string;
}

interface PartnerUserHeader {
  first_name: string;
  last_name: string;
  email: string;
  role: PartnerRole;
}

const ROLE_LABELS: Record<PartnerRole, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
  viewer: "Viewer",
};

const ROLE_COLORS: Record<PartnerRole, string> = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-indigo-100 text-indigo-800",
  staff: "bg-blue-100 text-blue-800",
  viewer: "bg-gray-100 text-gray-700",
};

const leadFields = [
  ["id", "Legal Intake Flow lead ID."],
  ["created_at", "When the lead was created in Legal Intake Flow."],
  ["updated_at", "When the lead was last updated."],
  ["source", "Where the lead came from, such as Disability Benefits Screening."],
  ["external_reference_id", "External source reference ID, when available."],
  ["dbs_report_number", "Disability Benefits Screening report number, when available."],
  ["first_name", "Lead first name."],
  ["last_name", "Lead last name."],
  ["phone", "Lead phone number."],
  ["email", "Lead email address."],
  ["city", "Lead city."],
  ["state", "Lead state."],
  ["zip", "Lead ZIP code."],
  ["benefit_type", "Type of disability benefit matter."],
  ["application_status", "Where the person is in the disability application process."],
  ["medical_summary", "Medical condition, symptoms, treatment, work impact, or related intake details."],
  ["additional_notes", "Additional intake notes provided by the lead."],
  ["status", "Current LIF lead status."],
  ["assigned_at", "When the lead was assigned to your firm."],
  ["assigned_partner_account_id", "Included in webhook payloads to identify the assigned partner account."],
  ["partner_response_status", "Your firm’s current response status for the lead."],
  ["partner_response_updated_at", "When your firm’s response status was last updated."],
  ["partner_viewed_at", "When the lead was viewed by your firm, if tracked."],
  ["partner_notes", "Notes your firm has saved in LIF, if any."],
] as const;

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-6 text-gray-100">
      <code>{children}</code>
    </pre>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold text-[#0d1b2e]">{title}</h2>
      <div className="mt-4 space-y-4 text-sm leading-6 text-gray-700">{children}</div>
    </section>
  );
}

export default async function PartnerIntegrationsSupportPage() {
  const session = await getAuthenticatedPartnerSession();
  if (!session) redirect("/partner/login");

  const { data: account, error: accountError } = await supabaseAdmin
    .from("partner_accounts")
    .select("firm_name")
    .eq("id", session.partnerAccountId)
    .single();

  if (accountError || !account) redirect("/partner/login");

  const { data: user } = await supabaseAdmin
    .from("partner_users")
    .select("first_name, last_name, email, role")
    .eq("id", session.partnerUserId)
    .single();

  const partnerAccount = account as PartnerAccountHeader;
  const partnerUser = user as PartnerUserHeader | null;
  const displayName = partnerUser ? `${partnerUser.first_name} ${partnerUser.last_name}` : "Partner User";
  const role = partnerUser?.role ?? session.role;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-[#0d1b2e]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/partner/dashboard" className="text-white/70 hover:text-white">Dashboard</Link>
            <Link href="/partner/account" className="text-white/70 hover:text-white">Account</Link>
            <Link href="/partner/leads" className="text-white/70 hover:text-white">Leads</Link>
            <Link href="/partner/reports" className="text-white/70 hover:text-white">Reports</Link>
            <Link href="/partner/billing" className="text-white/70 hover:text-white">Billing</Link>
            <Link href="/partner/invoices" className="text-white/70 hover:text-white">Invoices</Link>
            <Link href="/partner/team" className="text-white/70 hover:text-white">Team</Link>
            <Link href="/partner/integrations" className="font-semibold text-white">Integrations</Link>
          </nav>
          <PartnerLogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link href="/partner/integrations" className="text-sm font-semibold text-[#1a3a5c] hover:underline">
              ← Back to Integrations
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-[#0d1b2e]">API Key and Webhook Setup Guide</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
              Use this guide to connect {partnerAccount.firm_name} to your CRM, case management system, database, or internal intake workflow.
            </p>
          </div>
          {partnerUser && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Signed in as</p>
              <p className="mt-0.5 text-sm font-semibold text-[#0d1b2e]">{displayName}</p>
              <p className="text-xs text-gray-500">{partnerUser.email}</p>
              <div className="mt-1.5 flex justify-end">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_COLORS[role] ?? "bg-gray-100 text-gray-700"}`}>
                  {ROLE_LABELS[role] ?? role}
                </span>
              </div>
            </div>
          )}
        </div>

        <Section title="Two ways to connect">
          <p>
            Legal Intake Flow gives your firm two optional integration methods. You can use either one or both.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-[#0d1b2e]">API Access</h3>
              <p className="mt-1">Your system pulls assigned leads from LIF using an API key.</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="font-semibold text-[#0d1b2e]">Webhook Access</h3>
              <p className="mt-1">LIF sends assigned lead data to your HTTPS webhook URL when a lead is assigned or reassigned.</p>
            </div>
          </div>
        </Section>

        <Section title="API access instructions">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Go to <strong>Partner Dashboard → Integrations</strong>.</li>
            <li>Click <strong>Generate New API Key</strong>.</li>
            <li>Copy the key right away. The full key is only shown one time.</li>
            <li>Store it securely in your CRM, database connector, or server environment.</li>
            <li>Use the key as a Bearer token when calling the assigned leads endpoint.</li>
          </ol>
          <div>
            <p className="font-semibold text-[#0d1b2e]">Endpoint</p>
            <CodeBlock>{`GET https://www.legalintakeflow.com/api/external/partner/leads`}</CodeBlock>
          </div>
          <div>
            <p className="font-semibold text-[#0d1b2e]">Required header</p>
            <CodeBlock>{`Authorization: Bearer YOUR_API_KEY`}</CodeBlock>
          </div>
          <div>
            <p className="font-semibold text-[#0d1b2e]">Example request</p>
            <CodeBlock>{`curl -X GET "https://www.legalintakeflow.com/api/external/partner/leads?limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`}</CodeBlock>
          </div>
          <p>
            The API only returns leads assigned to your partner account. It does not return leads assigned to other firms.
          </p>
        </Section>

        <Section title="Optional API filters">
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Filter</th>
                  <th className="px-4 py-3">Example</th>
                  <th className="px-4 py-3">Use</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                <tr><td className="px-4 py-3 font-mono">limit</td><td className="px-4 py-3 font-mono">?limit=50</td><td className="px-4 py-3">Limits the number of leads returned. Maximum is 200.</td></tr>
                <tr><td className="px-4 py-3 font-mono">since</td><td className="px-4 py-3 font-mono">?since=2026-06-01T00:00:00.000Z</td><td className="px-4 py-3">Returns leads updated after the date/time provided.</td></tr>
                <tr><td className="px-4 py-3 font-mono">partner_response_status</td><td className="px-4 py-3 font-mono">?partner_response_status=new</td><td className="px-4 py-3">Filters by your firm’s lead response status.</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            Allowed partner response statuses are: new, reviewing, contact_attempted, contacted, accepted, declined, retained, and closed.
          </p>
        </Section>

        <Section title="Webhook setup instructions">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Go to <strong>Partner Dashboard → Integrations</strong>.</li>
            <li>Enter your webhook URL.</li>
            <li>The webhook URL must start with <strong>https://</strong>.</li>
            <li>Check <strong>Enable webhook delivery</strong>.</li>
            <li>Click <strong>Save Webhook Settings</strong>.</li>
            <li>Generate or rotate the webhook secret if your system will verify signatures.</li>
          </ol>
          <p>
            LIF sends a webhook when an admin assigns or reassigns a lead to your firm. Webhook delivery is best-effort. If your endpoint fails, the lead assignment still stays saved in LIF.
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p><strong>Method:</strong> POST</p>
              <p><strong>Content type:</strong> application/json</p>
              <p><strong>Events:</strong> lead.assigned, lead.reassigned</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p><strong>Signature header:</strong> x-lif-signature</p>
              <p><strong>Partner header:</strong> x-lif-partner-account-id</p>
              <p><strong>Event header:</strong> x-lif-event</p>
            </div>
          </div>
        </Section>

        <Section title="Webhook payload example">
          <CodeBlock>{`{
  "event": "lead.assigned",
  "sent_at": "2026-06-01T14:40:00.000Z",
  "partner_account_id": "partner-account-id",
  "lead": {
    "id": "lead-id",
    "created_at": "2026-06-01T14:30:00.000Z",
    "updated_at": "2026-06-01T14:35:00.000Z",
    "source": "disabilitybenefitsscreening",
    "external_reference_id": "dbs:lead-uuid",
    "dbs_report_number": "DBR-123456",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "555-555-5555",
    "email": "jane@example.com",
    "city": "Dallas",
    "state": "TX",
    "zip": "75001",
    "benefit_type": "Social Security Disability",
    "application_status": "Not sure",
    "medical_summary": "Medical and condition details provided by the lead.",
    "additional_notes": "Additional intake notes provided by the lead.",
    "status": "assigned",
    "assigned_partner_account_id": "partner-account-id",
    "assigned_at": "2026-06-01T14:40:00.000Z",
    "partner_response_status": "new",
    "partner_response_updated_at": null,
    "partner_viewed_at": null,
    "partner_notes": null
  }
}`}</CodeBlock>
        </Section>

        <Section title="Fields your firm can access">
          <p>
            API and webhook access is limited to leads assigned to your partner account. The available lead fields are listed below.
          </p>
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Field</th>
                  <th className="px-4 py-3">Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {leadFields.map(([field, meaning]) => (
                  <tr key={field}>
                    <td className="px-4 py-3 font-mono text-xs text-[#0d1b2e]">{field}</td>
                    <td className="px-4 py-3">{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Security notes">
          <ul className="list-disc space-y-2 pl-5">
            <li>Treat your API key like a password.</li>
            <li>Do not publish your API key in website code or public repositories.</li>
            <li>If a key is exposed, revoke it and generate a new one.</li>
            <li>If using webhooks, verify the raw request body with the webhook signing secret and the <span className="font-mono">x-lif-signature</span> header.</li>
            <li>Your API and webhook access does not include admin-only notes, billing records, invoices, other firms’ leads, or LIF internal settings.</li>
          </ul>
        </Section>

        <Section title="Troubleshooting checklist">
          <ul className="list-disc space-y-2 pl-5">
            <li>Confirm the API key is active and copied correctly.</li>
            <li>Confirm the request uses the Authorization Bearer header.</li>
            <li>Confirm the lead is actually assigned to your partner account.</li>
            <li>Confirm the webhook URL starts with https://.</li>
            <li>Confirm webhook delivery is enabled.</li>
            <li>Confirm your webhook endpoint returns a 2xx response.</li>
            <li>If verifying signatures, use the raw request body before JSON parsing.</li>
          </ul>
        </Section>
      </main>
    </div>
  );
}
