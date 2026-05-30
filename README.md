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
| `/admin/leads` | Lead queue — DBS-sourced leads, detail view, status management, manual partner assignment |

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

### Partner

| Route | Method | Description |
|---|---|---|
| `/api/partner/login` | `GET` | Validate one-time token, set partner session cookie (30d) |
| `/api/partner/logout` | `POST` | Clear partner session cookie |
| `/api/partner/request-login` | `POST` | Request a new login link (creates `partner_login_requests` row) |
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
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server only** |

> **After adding `LIF_DBS_INGEST_SECRET` to Vercel, you must redeploy for the ingest endpoint to become active.**

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
4. Admin copies and sends the link to the partner via email
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
