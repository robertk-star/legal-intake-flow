# Legal Intake Flow

**Domain:** legalintakeflow.com

Legal Intake Flow is an attorney and advocate partner platform that connects disability benefits claimants with licensed legal professionals. The platform delivers pre-screened, consent-based leads to partner attorneys and advocates specializing in SSDI and SSI cases.

---

## Stack

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS v4
- **Backend:** Express 4 + tRPC 11
- **Database:** Drizzle ORM + MySQL (TiDB)
- **Testing:** Vitest

---

## Pages

| Route | Page |
|---|---|
| `/` | Home — hero, how it works, value props, attorney benefits, FAQ, CTA |
| `/how-it-works` | Detailed 6-step process walkthrough |
| `/for-attorneys` | Attorney/advocate partner benefits and onboarding |
| `/request-access` | Partner access request form |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

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

## Tests

```bash
pnpm test
```

---

## Environment Variables

Create a `.env` file in the project root. Do **not** commit this file to version control.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL / TiDB connection string — e.g. `mysql://user:pass@host:4000/dbname?ssl={"rejectUnauthorized":true}` |
| `JWT_SECRET` | Yes | Secret used to sign session cookies. Use a long random string. |
| `VITE_ANALYTICS_ENDPOINT` | No | Analytics script endpoint (e.g. Umami) |
| `VITE_ANALYTICS_WEBSITE_ID` | No | Analytics website ID |

---

## Database Migration — Phase 2

### Required migration

Before the Request Access form can save submissions, run the Phase 2 migration against your database.

**Migration file:** `sql/section01_partner_access_requests.sql`

This migration creates the `partner_access_requests` table with the full Phase 2 column set:

- **Contact:** `first_name`, `last_name`, `firm_name`, `email`, `phone`, `website`
- **Practice:** `states_served`, `practice_area`, `monthly_lead_capacity`
- **Notes:** `message`
- **Workflow:** `status` (enum: `new` / `reviewed` / `approved` / `declined` / `contacted`), `source`
- **Timestamps:** `created_at`, `updated_at` (auto-updated on row change via `ON UPDATE`)
- **Indexes** on `created_at`, `email`, `status`

### How to run the migration

**Option A — Run SQL directly** (recommended for production):

```bash
mysql -h <host> -P <port> -u <user> -p <database> < sql/section01_partner_access_requests.sql
```

Or paste the contents of `sql/section01_partner_access_requests.sql` into your database client (TiDB Cloud SQL editor, TablePlus, DBeaver, etc.).

**Option B — Drizzle push** (development only):

```bash
pnpm db:push
```

> **Note:** `pnpm db:push` runs `drizzle-kit generate && drizzle-kit migrate` and requires `DATABASE_URL` to be set. Use Option A for production deployments.

### Existing data

If you already have rows in the old Phase 1 `partner_access_requests` table, use the `ALTER TABLE` block at the bottom of `sql/section01_partner_access_requests.sql` instead of the `CREATE TABLE` block. The `ALTER TABLE` block adds only the new columns and is safe to run on a live table.

---

## Request Access Form

The `/request-access` page submits to the `partnerAccess.submit` tRPC mutation at `POST /api/trpc/partnerAccess.submit`.

### Required fields

- First Name
- Last Name
- Firm or Organization Name
- Email Address
- Phone Number
- State(s) Served (free text, e.g. "California, Texas")
- Practice Area (select: Social Security Disability, SSI, SSDI, Veterans Disability, Workers' Compensation, Personal Injury, Other)
- Estimated Monthly Lead Capacity (select: 1–10, 11–25, 26–50, 51–100, 100+)

### Optional fields

- Website
- Message / Notes

### Behavior

- All required fields are validated client-side (Zod + react-hook-form) before submission
- Submit button shows "Submitting…" and is disabled while the request is in flight
- On success: form is replaced by a confirmation message
- On API/network error: an inline error message is shown with a mailto fallback
- A hidden honeypot field (`_hp`) is included; if filled by a bot, the server silently returns success without inserting a row
- Submissions are stored in `partner_access_requests` with `status = 'new'` and `source = 'legalintakeflow.com'`
- Email and string fields are trimmed server-side; email is lowercased before insert
- No email notification is sent in Phase 2 — database save only

---

## Contact

Partner inquiries: partners@legalintakeflow.com
Legal: legal@legalintakeflow.com
