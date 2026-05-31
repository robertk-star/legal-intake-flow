# Legal Intake Flow

**Domain:** legalintakeflow.com

Legal Intake Flow (LIF) is an attorney and advocate partner platform. It receives approved, qualified leads from [Disability Benefits Screening](https://disabilitybenefitsscreening.com) (DBS) and manages attorney/advocate referrals. LIF is **not** a public claimant intake platform — all claimant intake is handled by DBS.

---

## Architecture Overview

| Platform | Role |
|---|---|
| **Disability Benefits Screening (DBS)** | Public claimant intake — screens and qualifies claimants |
| **Legal Intake Flow (LIF)** | Attorney/advocate partner platform — receives qualified leads from DBS, manages referrals |

DBS pushes approved leads to LIF via `POST /api/intake/ingest` using a shared secret (`LIF_DBS_INGEST_SECRET`). LIF stores those leads and presents them to admin for review and manual partner assignment.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Supabase / PostgreSQL |
| Deployment | Vercel |

---

## Pages

### Public

| Route | Page |
|---|---|
| `/` | Homepage — hero, how it works, why attorneys join, intake standards, platform principles, CTA |
| `/how-it-works` | Full 5-step intake process walkthrough |
| `/for-attorneys` | Partner program — who we partner with, what partners receive, why organized intake matters |
| `/request-access` | Partner access request form |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

### Admin (password-protected)

| Route | Page |
|---|---|
| `/admin/login` | Admin login page |
| `/admin/partner-requests` | Partner requests dashboard — search, filter, status update, create partner account, generate login link |
| `/admin/partners` | Partner accounts dashboard — manage accounts, users, login requests, generate login links |
| `/admin/leads` | Lead queue — DBS-sourced leads, detail view, status management, manual/best-match partner assignment |
| `/admin/notifications` | Email notification log — delivery status for login links and lead assignment notifications |
| `/admin/reports` | Reporting dashboard — lead volume, assignment performance, partner activity, coverage gaps, notifications |
| `/admin/system-check` | Production QA system check — required ENV, table/column probes, safety assumptions |
| `/admin/exports` | Data Export Center — controlled CSV exports for leads, partners, billing, invoices, notifications, and audit review |
| `/admin/billing` | Billing readiness review — mark assigned leads billable, invoiced, waived, disputed, etc. |
| `/admin/billing/statements` | Partner billing statements — date-range summaries and CSV export for reviewed billable/invoiced leads |

### Partner (session-protected)

| Route | Page |
|---|---|
| `/partner/login` | One-time token login page — validates token, sets partner session cookie, redirects to account |
| `/partner/account` | Partner profile page — firm info, account status, signed-in user info |
| `/partner/leads` | Partner lead dashboard — assigned DBS leads, lead detail, partner response status, partner notes |

---

## API Routes

### DBS Lead Ingestion (shared secret required)

| Route | Method | Description |
|---|---|---|
| `/api/intake/ingest` | `POST` | Receive a qualified lead from DBS. Requires `x-lif-ingest-secret` header matching `LIF_DBS_INGEST_SECRET`. Stores lead with `source = "disabilitybenefitsscreening"`, `status = "new"`. No automatic routing. |

### Public

| Route | Method | Description |
|---|---|---|
| `/api/partner-access-requests` | `POST` | Submit a partner access request — validates, checks honeypot, inserts to Supabase |

### Admin (HTTP-only cookie required)

| Route | Method | Description |
|---|---|---|
| `/api/admin/login` | `POST` | Validate `LIF_ADMIN_PASSWORD`, set `lif_admin_session` HTTP-only cookie (8h) |
| `/api/admin/logout` | `POST` | Clear admin session cookie |
| `/api/admin/partner-requests` | `GET` | List requests — supports `status`, `search`, `limit` query params |
| `/api/admin/partner-requests/[id]` | `GET` | Get single request detail |
| `/api/admin/partner-requests/[id]` | `PATCH` | Update `status` and/or `internal_notes` |
| `/api/admin/partner-requests/[id]/create-partner-account` | `POST` | Create a `partner_accounts` row and initial owner `partner_users` row from an approved request |
| `/api/admin/partners` | `GET` | List partner accounts — supports `search`, `status`, `accepting_leads`, `limit` |
| `/api/admin/partners/[id]` | `GET` / `PATCH` | Get or update partner account detail |
| `/api/admin/partners/[id]/generate-login-link` | `POST` | Generate account-level one-time login link (resolves owner user) |
| `/api/admin/partners/[id]/users` | `GET` / `POST` | List or create partner users for an account |
| `/api/admin/partner-users/[id]` | `PATCH` | Update partner user role, status, or name |
| `/api/admin/partner-users/[id]/generate-login-link` | `POST` | Generate user-scoped one-time login link |
| `/api/admin/login-requests` | `GET` | List partner login requests — supports `status`, `limit` |
| `/api/admin/login-requests/[id]` | `PATCH` | Update login request status (complete / dismiss) |
| `/api/admin/leads` | `GET` | List DBS-ingested leads — supports `search`, `state`, `benefit_type`, `status`, `assigned`, `limit` |
| `/api/admin/leads/[id]` | `GET` | Get full lead detail including `raw_payload` |
| `/api/admin/leads/[id]` | `PATCH` | Update `status`, `internal_review_notes`, `assigned_partner_account_id` |
| `/api/admin/leads/[id]/eligible-partners` | `GET` | Routing eligibility preview — state, benefit, stage, capacity, and accepting-leads checks |
| `/api/admin/leads/[id]/assign-best-match` | `POST` | Admin-triggered assignment engine — assigns the highest-scoring eligible partner, records an assignment event, and sends assignment notifications |
| `/api/admin/leads/[id]/send-assignment-notification` | `POST` | Resend/send assignment email notification for the lead's currently assigned partner account |
| `/api/admin/notifications` | `GET` | List email notification delivery logs — supports `status`, `type`, `limit` |
| `/api/admin/reports` | `GET` | Admin reporting and analytics summary |
| `/api/admin/system-check` | `GET` | Production readiness check for required ENV, database tables/columns, and safety assumptions |
| `/api/admin/billing` | `GET` | Billing-readiness lead review dashboard data |
| `/api/admin/billing/leads/[id]` | `PATCH` | Update billing status, amount, and notes for an assigned lead |
| `/api/admin/billing/statements` | `GET` | Partner billing statement summaries by date range, partner, and billing status |
| `/api/admin/billing/statements/export` | `GET` | Download partner billing statement data as CSV |

### Partner

| Route | Method | Description |
|---|---|---|
| `/api/partner/login` | `GET` | Validate one-time token, set partner session cookie (30d) |
| `/api/partner/logout` | `POST` | Clear partner session cookie |
| `/api/partner/request-login` | `POST` | Request a new login link; emails a one-time login link when a matching active/pending partner user exists |
| `/api/partner/preferences` | `PATCH` | Update partner preferences |
| `/api/partner/leads` | `GET` | List leads assigned to the authenticated partner account |
| `/api/partner/leads/[id]` | `GET` / `PATCH` | Get assigned lead detail; update partner response status and partner notes |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `LIF_ADMIN_PASSWORD` | Yes | Password for the internal admin area at `/admin/login` — **server only** |
| `LIF_ADMIN_SESSION_SECRET` | Recommended | HMAC SHA-256 signing secret for admin session tokens. Falls back to `LIF_ADMIN_PASSWORD` if not set. Generate: `openssl rand -base64 48`. **Server only.** |
| `LIF_PARTNER_SESSION_SECRET` | Yes | HMAC SHA-256 signing secret for partner session tokens. Generate: `openssl rand -base64 48`. **Server only.** |
| `LIF_DBS_INGEST_SECRET` | Yes | Shared secret for DBS-to-LIF lead ingestion. Must match the value set in DBS. Generate: `openssl rand -base64 48`. **Server only.** |
| `RESEND_API_KEY` | Yes for email notifications | Resend API key used by Phase 14 email notifications. **Server only.** |
| `LIF_EMAIL_FROM` | Yes for email notifications | Verified Resend sender address, for example `Legal Intake Flow <notifications@legalintakeflow.com>`. |
| `LIF_EMAIL_REPLY_TO` | Optional | Reply-to address for notification emails. |
| `LIF_APP_URL` | Recommended | Public app URL used in email links, for example `https://legalintakeflow.com`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server only** |

> **After adding `LIF_DBS_INGEST_SECRET` to Vercel, you must redeploy for the ingest endpoint to become active.**
>
> **After adding or changing email environment variables (`RESEND_API_KEY`, `LIF_EMAIL_FROM`, `LIF_EMAIL_REPLY_TO`, `LIF_APP_URL`), redeploy before testing email notifications.**

---

## Database Migrations

Run migrations in order against your Supabase project using the SQL Editor.

| File | Description |
|---|---|
| `sql/section01_partner_access_requests.sql` | `partner_access_requests` table |
| `sql/section02_partner_request_admin_review.sql` | Adds `internal_notes` column, confirms status constraint |
| `sql/section03_partner_accounts.sql` | `partner_accounts` and `partner_login_tokens` tables |
| `sql/section04_partner_preferences.sql` | Adds partner preference columns to `partner_accounts` |
| `sql/section05_partner_login_requests.sql` | `partner_login_requests` table |
| `sql/section06_partner_users.sql` | `partner_users` table, backfill owner users, `partner_user_id` on tokens and login requests |
| `sql/section07_leads.sql` | Initial `public.leads` table (Phase 9 — public intake, now superseded) |
| `sql/section08_dbs_lead_ingestion.sql` | Adapts `public.leads` for DBS ingestion: adds `source`, `external_reference_id`, `raw_payload`, `internal_review_notes`, `assigned_at`, `partner_response_status`; removes public insert policy; updates status constraint to DBS values; makes contact fields nullable |
| `sql/section09_partner_lead_dashboard.sql` | **Run this for Phase 11.** Adds partner lead workflow fields: `partner_notes`, `partner_response_updated_at`, `partner_viewed_at`; adds valid partner response status constraint and indexes |
| `sql/section10_partner_routing_rules.sql` | **Run this for Phase 12.** Adds structured `routing_states`, routing timestamps/notes, backfills from `states_served`, and adds indexes for routing eligibility previews |
| `sql/section11_lead_assignment_engine.sql` | **Run this for Phase 13.** Adds `lead_assignment_events` audit table for manual, best-match, and reassignment events |
| `sql/section12_email_notifications.sql` | **Run this for Phase 14.** Adds `email_notifications` delivery log table for partner login-link emails and lead assignment notifications |

> **Note:** `section07_leads.sql` created the initial leads table for a public intake approach that has been superseded. Run `section08_dbs_lead_ingestion.sql` after `section07` (or instead of it on a fresh database) to align the schema with the DBS ingestion architecture.

---

## DBS Lead Ingestion

DBS sends qualified leads to LIF via:

```
POST https://legalintakeflow.com/api/intake/ingest
x-lif-ingest-secret: <LIF_DBS_INGEST_SECRET>
Content-Type: application/json

{
  "external_reference_id": "dbs-lead-abc123",
  "first_name": "Jane",
  "last_name": "Doe",
  "phone": "555-555-5555",
  "email": "jane@example.com",
  "city": "Springfield",
  "state": "IL",
  "zip": "62701",
  "benefit_type": "SSDI",
  "application_status": "Denied",
  "medical_summary": "...",
  "additional_notes": "..."
}
```

All fields except the secret header are optional. The full incoming JSON is stored in `raw_payload` for audit and debugging. Leads are created with `status = "new"` and no automatic partner assignment.

---


## Partner Routing Rules & Eligibility Preview

Phase 12 prepares the data and admin workflow needed before automatic routing. Partners can now maintain structured **States Accepted for Routing** on `/partner/account`. The admin lead detail modal shows a **Routing Eligibility Preview** for each lead, ranking partners by manual-routing readiness.

Eligibility checks include:

- partner account status is active
- partner is accepting leads
- partner lead status is active
- lead state matches partner routing states
- benefit type matches accepted programs (`SSDI`, `SSI`)
- application stage matches accepted stages (`initial`, `appeal`, `hearing`)
- current-month assignments are below the parsed monthly capacity

This preview is informational only. Admin must still manually choose a partner and click **Save Changes**. No automatic matching or routing is included in Phase 12.

## Lead Assignment Engine

Phase 13 adds an admin-triggered assignment engine. The same routing evaluator used for the preview is now reusable in `lib/leadRouting.ts`. In `/admin/leads`, admins can click **Assign Best Match** inside a lead detail modal.

The button:

- chooses the highest-scoring eligible partner
- assigns the lead to that partner
- sets lead status to `assigned`
- sets `assigned_at` for new assignments/reassignments
- initializes `partner_response_status = new`
- clears prior partner response fields when reassigned to a different firm
- writes an audit row to `lead_assignment_events` when the Phase 13 migration has been run

Manual assignment remains available. Phase 13 does **not** automatically assign leads when DBS ingests them. Phase 14 adds email notifications after admin assignment actions.

## Partner Lead Dashboard

Admin assigns DBS-sourced leads manually from `/admin/leads`. Assigned leads appear for the partner at `/partner/leads`.

Partner users can:

- view assigned claimant/contact details
- review benefit/application information
- update partner response status
- add partner notes

Partner response statuses:

```
new
reviewing
contact_attempted
contacted
accepted
declined
retained
closed
```

Viewer-role partner users can view assigned leads but cannot update status or notes. No automatic matching, routing, email sending, or billing is included in this phase.

---

## Partner Login Flow

1. Admin reviews a partner request in `/admin/partner-requests`
2. Admin clicks **Create Partner Account** — creates a row in `partner_accounts` and an initial `owner` row in `partner_users`
3. Admin navigates to `/admin/partners`, opens the account, and clicks **Generate Login Link** for the owner user
4. Admin can copy/send the initial link manually, or the partner can later request an automatic login email from `/partner/login`
5. Partner visits the link → `/partner/login?token=<raw_token>`
6. Server hashes the token, looks up the hash in `partner_login_tokens`, validates expiry and used status
7. Token is marked as used, `last_login_at` is updated on both `partner_accounts` and `partner_users`, a 30-day signed session cookie is set (includes `partnerAccountId`, `partnerUserId`, `role`)
8. Partner is redirected to `/partner/account`

**Security notes:**
- Only the SHA-256 hash of the raw token is stored in the database
- The raw token is shown to the admin once and never persisted
- Partner session tokens are HMAC SHA-256 signed with `LIF_PARTNER_SESSION_SECRET`
- All partner session cookies are HTTP-only, secure in production, sameSite lax

---

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm build
```

## Type Check

```bash
pnpm tsc --noEmit
```

---

## Deployment

This project is Vercel-compatible. Connect the GitHub repository to Vercel and add all required environment variables in the Vercel project settings. After adding `LIF_DBS_INGEST_SECRET`, redeploy to activate the ingest endpoint.

---

## Contact

Partner inquiries: partners@legalintakeflow.com
Legal: legal@legalintakeflow.com


## Email Notifications

Phase 14 adds transactional email delivery through Resend. Email is sent only from server-side routes and every attempt is logged in `public.email_notifications`.

### Partner login link email

When a partner visits `/partner/login`, enters their email, and the email matches an active or pending `partner_users` row, LIF automatically generates a new one-time login token and emails the login link. The public response remains neutral so the page does not reveal whether an account exists.

If email configuration is missing or delivery fails, the login request remains visible to admin in `/admin/partners` so admin can still generate a login link manually.

### Lead assignment email

When admin manually assigns/reassigns a lead or clicks **Assign Best Match**, LIF emails active partner users on the assigned account with one of these roles:

- owner
- admin
- staff

Viewer users are not notified. The email includes a short lead summary and a link to `/partner/leads`. For privacy, medical details are not included in the email. Assignment emails are **not** sent automatically when DBS ingests a lead; DBS ingestion still only creates the lead.

### Notification log

Admins can review delivery attempts at `/admin/notifications`. Logged statuses are:

- `queued`
- `sent`
- `failed`
- `skipped`

Email delivery uses Resend through the server-side environment variables:

- `RESEND_API_KEY`
- `LIF_EMAIL_FROM`
- optional `LIF_EMAIL_REPLY_TO`
- recommended `LIF_APP_URL`

---

## Reporting & Analytics

Phase 15 adds an admin reporting dashboard at `/admin/reports`.

The reports page is admin-auth protected and summarizes existing LIF operational data from:

- `leads`
- `partner_accounts`
- `partner_users`
- `lead_assignment_events`
- `email_notifications`

### Included report sections

- Lead volume: total leads, this week, this month, lead status, state, benefit type, and source
- Assignment performance: assigned vs unassigned, assignment rate, average time to assign, assignment type, and leads assigned by partner
- Partner response: partner response statuses, average time to view, average time to respond, retained leads, and declined leads
- Partner activity: active partners, accepting leads, partner users, unviewed assigned leads, and partners near capacity
- Coverage gaps: states with leads but no eligible routing partners, states with partner coverage but no leads, benefit-type coverage gaps, and paused/at-capacity partners
- Email notifications: sent/failed/skipped/queued counts, notification type counts, and recent failed delivery attempts

### API route

`GET /api/admin/reports`

No new SQL migration is required for Phase 15. The reports use tables and columns created by prior migrations through Phase 14.

No new Vercel environment variables are required for Phase 15.


---

## Production QA & System Check

Phase 16 adds a production QA and hardening pass.

### System check page

Admins can open:

```
/admin/system-check
```

The page checks:

- required environment variables
- recommended email environment variables
- Supabase connectivity
- expected tables and phase columns
- production safety assumptions

The page does **not** display secret values. It only shows whether each item is configured or missing.

### System check API

```
GET /api/admin/system-check
```

This route is admin-auth protected and returns structured check results for the system check page.

### QA checklist

A production QA checklist is available at:

```
docs/production-qa-checklist.md
```

Use it after deployments, SQL migrations, Vercel environment variable changes, and major feature releases.

No new SQL migration is required for Phase 16.

No new Vercel environment variables are required for Phase 16.

---

## Billing Readiness

Phase 17 adds internal billing-readiness review. This is **not** payment processing and does not add Stripe, invoices, automatic charges, or partner payment collection.

### Admin billing page

Admins can open:

```
/admin/billing
```

The page helps admin review assigned partner leads and track whether each lead is:

- not reviewed
- review needed
- not billable
- billable
- invoiced
- waived
- disputed

It also shows a partner billing snapshot and recent billing audit events.

### API routes

```
GET /api/admin/billing
PATCH /api/admin/billing/leads/[id]
```

Both routes are admin-auth protected.

### SQL migration

Run this migration before testing Phase 17:

```
sql/section13_billing_readiness.sql
```

This migration adds billing-readiness fields to `public.leads` and creates the `public.lead_billing_events` audit table.

### Environment variables

No new Vercel environment variables are required for Phase 17.
---

## Partner Billing Statements

Phase 18 adds billing-period statements and CSV exports for admin review. This is still **not** payment processing and does not add Stripe, invoice sending, automatic charges, or partner payment collection.

### Admin statements page

Admins can open:

```
/admin/billing/statements
```

The page allows admin to:

- choose a billing period date range
- filter by partner
- include billable/invoiced or other billing statuses
- review partner-level statement totals
- expand each partner statement to see individual leads
- export the current statement view as CSV

### API routes

```
GET /api/admin/billing/statements
GET /api/admin/billing/statements/export
```

Both routes are admin-auth protected.

### SQL migration

No new SQL migration is required for Phase 18. It uses the billing-readiness fields from:

```
sql/section13_billing_readiness.sql
```

### Environment variables

No new Vercel environment variables are required for Phase 18.


---

## Phase 19 — Partner Billing Portal

Phase 19 adds a read-only partner billing statement portal. Partners can review lead billing statuses and amounts that LIF admin has already marked in the billing readiness workflow.

### New Partner Page

| Route | Purpose |
|---|---|
| `/partner/billing` | Partner-facing billing statement preview for the logged-in partner account |

### New Partner API Routes

| Route | Purpose |
|---|---|
| `GET /api/partner/billing` | Returns billing statement summary and lead billing records for the authenticated partner account only |
| `GET /api/partner/billing/export` | Exports the authenticated partner account's billing statement view as CSV |

### Important Notes

- This is not payment processing.
- This does not generate legal invoices.
- This does not connect Stripe or any payment gateway.
- Partners can only see billing records for leads assigned to their own partner account.
- Partners cannot edit billing status, billing amounts, or billing notes.
- Billing values are controlled by admin through `/admin/billing`.

### Phase 19 Setup

No new SQL migration is required for Phase 19.

No new Vercel environment variable is required for Phase 19.

Phase 19 depends on the Phase 17 billing readiness migration:

```text
sql/section13_billing_readiness.sql
```

## Phase 20 — Invoice Drafts & Payment Tracking Foundation

Phase 20 adds internal invoice records and payment-status tracking without adding Stripe, payment processing, automatic charges, or invoice emails.

### New SQL migration

Run after deployment:

```text
sql/section14_invoice_drafts.sql
```

Creates:

- `partner_billing_invoices`
- `partner_billing_invoice_items`
- `partner_billing_invoice_events`

### New admin routes

- `/admin/billing/invoices` — create invoice drafts, view invoice records, update invoice status/payment tracking, export invoice CSV.

### New admin API routes

- `GET /api/admin/billing/invoices`
- `POST /api/admin/billing/invoices`
- `GET /api/admin/billing/invoices/[id]`
- `PATCH /api/admin/billing/invoices/[id]`
- `GET /api/admin/billing/invoices/[id]/export`

### New partner routes

- `/partner/invoices` — read-only partner invoice list.

### New partner API routes

- `GET /api/partner/invoices`
- `GET /api/partner/invoices/[id]/export`

### Important

This phase does not add Stripe, ACH, credit cards, payment processing, automatic invoice sending, or billing emails. It is invoice draft and payment-status tracking only.

## Phase 21 — Invoice Email Delivery

Phase 21 adds admin-triggered invoice email delivery. It does not add Stripe, payment links, payment processing, automatic charges, or invoice sending on a schedule.

### New route

- `POST /api/admin/billing/invoices/[id]/send-email` — admin-auth protected; sends the selected invoice notice to active owner/admin users on the partner account.

### Updated admin UI

- `/admin/billing/invoices` invoice detail modal now includes an **Invoice Email** section with a **Send Invoice Email** button.
- The modal shows the last invoice email sent timestamp and the invoice email count.
- `/admin/notifications` now includes `invoice_sent` notification records.

### SQL required

Run:

```text
sql/section15_invoice_email_delivery.sql
```

This adds invoice email tracking fields, connects email notification rows to invoice IDs, and allows `email_sent` events in the invoice event log.

### Environment variables

No new environment variables are required if Phase 14 email is already configured.

Live email delivery still requires:

```text
RESEND_API_KEY
LIF_EMAIL_FROM
```

Recommended:

```text
LIF_EMAIL_REPLY_TO
LIF_APP_URL
```

If email is not configured, sends are skipped and logged in `/admin/notifications`.

## Phase 22 — Invoice Reminder & Overdue Tracking

Phase 22 adds invoice due dates, overdue visibility, and invoice reminder email delivery. It does not add Stripe, payment links, payment processing, or automatic charges.

### New SQL migration

Run after deploying Phase 22:

```text
sql/section16_invoice_reminders_overdue.sql
```

This migration adds these fields to `partner_billing_invoices`:

- `due_date`
- `reminder_sent_at`
- `reminder_count`
- `overdue_marked_at`

It also allows invoice event types:

- `reminder_sent`
- `due_date_updated`

### Updated admin invoice tools

Admin can now set an invoice due date and send invoice reminder emails from:

```text
/admin/billing/invoices
```

Reminder emails use the existing Resend configuration from Phase 14:

```text
RESEND_API_KEY
LIF_EMAIL_FROM
```

Recommended:

```text
LIF_EMAIL_REPLY_TO
LIF_APP_URL
```

### Updated partner invoice portal

Partners can see invoice due date and reminder count on:

```text
/partner/invoices
```

### No new Vercel ENV

No new Vercel environment variable is required for Phase 22 if Phase 14 email is already configured.

## Phase 23 — Partner Invoice Disputes & Admin Resolution

Phase 23 adds a structured billing review workflow. Partners can submit questions or disputes from `/partner/invoices`, and admins can review and resolve them at `/admin/billing/disputes`.

### New routes

- `POST /api/partner/invoices/[id]/disputes` — partner creates an invoice-level billing review request.
- `GET /api/partner/invoice-disputes` — partner sees their own invoice disputes.
- `GET /api/admin/billing/disputes` — admin list of billing disputes.
- `PATCH /api/admin/billing/disputes/[id]` — admin updates dispute status and resolution notes.
- `/admin/billing/disputes` — admin dispute review dashboard.

### New SQL migration

Run this before testing Phase 23:

```text
sql/section17_invoice_disputes.sql
```

This creates `partner_billing_disputes` and updates invoice event logging to allow `dispute_updated` events.

### Phase 23 exclusions

Phase 23 does not add Stripe, payment processing, automatic credits, automatic balance adjustments, public LIF intake, or DBS frontend code.

## Phase 24 — Partner Team Management & User Invitations

Phase 24 adds partner-side team management.

New partner page:

| Route | Purpose |
|---|---|
| `/partner/team` | Partner owners/admins manage firm users and send invitations |

New partner API routes:

| Route | Method | Purpose |
|---|---|---|
| `/api/partner/team` | `GET` | List team users for the logged-in partner account |
| `/api/partner/team` | `POST` | Add a team user to the logged-in partner account |
| `/api/partner/team/[id]` | `PATCH` | Update a team user's name, role, or status |
| `/api/partner/team/[id]/send-invite` | `POST` | Generate a one-time login link and send a team invitation email |

SQL migration:

| File | Purpose |
|---|---|
| `sql/section18_partner_team_management.sql` | Adds partner user invite tracking fields |

Notes:

- Owners can add/edit any role.
- Partner admins can add/edit staff and viewer users only.
- Staff/viewer users can view the team list but cannot manage users.
- The system keeps at least one active or pending owner on each partner account.
- Invitation emails use the existing Resend setup from Phase 14.
- If email is not configured, the invite route returns the one-time login link so it can be copied manually.
- No Stripe, payment processing, public LIF intake, or DBS frontend code is added.

## Phase 25 — Partner Firm Profile & Billing Contact Settings

Phase 25 lets partner owner/admin users maintain their own firm profile and billing contact details from the partner account page.

Updated partner page:

| Route | Purpose |
|---|---|
| `/partner/account` | Shows editable Firm Profile & Billing Contact card for owner/admin users |

New partner API route:

| Route | Method | Purpose |
|---|---|---|
| `/api/partner/profile` | `PATCH` | Owner/admin users update firm profile and billing contact fields for their own partner account |

SQL migration:

| File | Purpose |
|---|---|
| `sql/section19_partner_profile_billing_contacts.sql` | Adds billing contact, billing address, and profile update tracking fields to `partner_accounts` |

Notes:

- Owner/admin partner users can edit firm profile and billing contact details.
- Staff/viewer partner users can view these fields but cannot edit them.
- Admin partner management now displays the partner-maintained billing contact details.
- This phase does not add Stripe, payment processing, automatic charges, public LIF intake, or DBS frontend code.

## Phase 26 — Partner Profile UX Cleanup & Change History

Phase 26 improves the partner firm profile editing experience and adds an audit trail for partner-maintained profile changes.

Updated behavior:

| Area | Change |
|---|---|
| `/partner/account` | Website field now accepts either a bare domain like `saffhire.com` or a full URL like `https://saffhire.com` |
| `/api/partner/profile` | Automatically normalizes bare domains by adding `https://` and lowercasing the hostname |
| `/admin/partners` | Partner detail modal now shows recent partner profile/billing contact change history |
| `/admin/system-check` | Checks the profile change history table |

New admin API route:

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/partners/[id]/profile-events` | `GET` | Returns recent partner profile/billing contact change events for admin review |

SQL migration:

| File | Purpose |
|---|---|
| `sql/section20_partner_profile_ux_audit.sql` | Creates `partner_account_profile_events` audit table |

Notes:

- No payment processing, Stripe, automatic charges, public LIF intake, or DBS frontend code was added.
- Partner profile audit logging is non-blocking. If audit logging fails, the profile save still succeeds.
- Before testing Phase 26, run `sql/section20_partner_profile_ux_audit.sql` in Supabase.
- No new Vercel environment variable is required.

## Phase 27 — Admin Activity Timeline

Phase 27 adds a centralized internal activity timeline for operations and troubleshooting.

### New admin page

- `/admin/activity` — Activity Timeline

### New admin API route

- `GET /api/admin/activity` — returns a combined admin-authenticated activity feed from existing audit/event tables.

The timeline includes:

- lead assignment events
- email notification attempts
- lead billing review events
- invoice events
- invoice dispute events
- partner profile change events

Filters include category, search, start date, and end date.

### Setup

No new SQL migration is required for Phase 27.

No new Vercel environment variable is required for Phase 27.


---

## Phase 28 — Admin Data Export Center

Phase 28 adds a controlled CSV export center for internal admin use.

### Admin Page

- `/admin/exports` — choose an export dataset, date range, optional partner/status filters, and row limit.

### Export APIs

- `GET /api/admin/exports` — returns export catalog metadata.
- `GET /api/admin/exports/download` — returns CSV download for the selected dataset.

### Supported Export Datasets

- Leads
- Partner Accounts
- Partner Users
- Invoices
- Invoice Items
- Lead Billing Events
- Invoice Events
- Invoice Disputes
- Email Notifications
- Partner Profile Events

### Setup

No new SQL migration is required for Phase 28.

No new Vercel environment variable is required for Phase 28.

### Safety Notes

- All export routes require admin authentication.
- CSV values that could be interpreted as spreadsheet formulas are escaped.
- Exports are capped at a maximum row limit to avoid accidental large downloads.
- No public claimant intake, Stripe, payment processing, DBS frontend code, or automatic routing was added.

---

## Phase 29 — Partner Onboarding Polish

Phase 29 adds a partner-facing onboarding dashboard and setup readiness experience.

### New partner route

| Route | Purpose |
|---|---|
| `/partner` | Redirects authenticated partner users to `/partner/dashboard` |
| `/partner/dashboard` | Partner dashboard with setup readiness, checklist, operational summary cards, routing readiness, team access summary, and quick links |

### Partner dashboard includes

- Setup readiness percentage
- Onboarding checklist for:
  - firm profile completion
  - routing preferences
  - billing contact details
  - team invitations
- Assigned lead count
- New lead count
- Open invoice count
- Open billing dispute count
- Routing readiness summary
- Team access summary
- Quick links to Leads, Invoices, Team, and Account settings

### Partner navigation

The partner navigation now includes:

- Dashboard
- Account
- Leads
- Billing
- Invoices
- Team

### SQL / ENV

No new SQL migration is required for Phase 29.

No new Vercel environment variable is required for Phase 29.

### Not included

Phase 29 does not add billing, Stripe, payment processing, automatic routing, public LIF intake, or DBS frontend code.

## Phase 30 — Admin Dashboard Home

Phase 30 adds a read-only admin landing dashboard at `/admin`.

New routes:

- `GET /api/admin/dashboard` — admin-auth protected operational dashboard summary.
- `/admin` — admin dashboard home.

Dashboard sections include:

- key operating metrics
- action center for leads, failed emails, overdue invoices, disputes, and pending partner requests
- lead status distribution
- billing snapshot
- notification status snapshot
- top partner assignments
- recent leads, assignments, and email attempts

This phase does not add SQL migrations, new environment variables, automatic routing, payment processing, public claimant intake, or DBS frontend changes.
