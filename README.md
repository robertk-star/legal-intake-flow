# Legal Intake Flow

**Domain:** legalintakeflow.com

Legal Intake Flow is an attorney and advocate partner platform delivering consent-based, structured disability benefits leads to licensed legal professionals specializing in SSDI and SSI cases.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Database | Supabase / PostgreSQL |
| Validation | Zod |
| Deployment | Vercel |

---

## Pages

| Route | Page |
|---|---|
| `/` | Homepage — hero, how it works, why attorneys join, intake standards, platform principles, CTA |
| `/how-it-works` | Full 5-step intake process walkthrough |
| `/for-attorneys` | Partner program — who we partner with, what partners receive, why organized intake matters |
| `/request-access` | Partner access request form |
| `/privacy` | Privacy Policy |
| `/terms` | Terms of Use |

---

## API Routes

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

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `LIF_ADMIN_PASSWORD` | Yes | Password for the internal admin area at `/admin/login` — **server only, never expose client-side** |
| `LIF_ADMIN_SESSION_SECRET` | Recommended | HMAC SHA-256 signing secret for admin session tokens. Falls back to `LIF_ADMIN_PASSWORD` if not set. Generate with `openssl rand -base64 48`. **Server only.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server only, never expose client-side** |

---

## Database Migration

Run the SQL migration against your Supabase project before the form can save submissions.

**Migration file:** `sql/section01_partner_access_requests.sql`

### Option A — Supabase SQL Editor (recommended)

1. Open your Supabase project → SQL Editor
2. Paste the contents of `sql/section01_partner_access_requests.sql`
3. Run

### Option B — psql CLI

```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  -f sql/section01_partner_access_requests.sql
```

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

This project is Vercel-compatible. Connect the GitHub repository to Vercel and add the required environment variables in the Vercel project settings.

---

## Contact

Partner inquiries: partners@legalintakeflow.com
Legal: legal@legalintakeflow.com
