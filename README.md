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

### Partner (session-protected)

| Route | Page |
|---|---|
| `/partner/login` | One-time token login page — validates token, sets partner session cookie, redirects to account |
| `/partner/account` | Partner profile page — firm info, account status, lead dashboard (coming soon) |

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
| `/api/admin/partner-requests/[id]/create-partner-account` | `POST` | Create a `partner_accounts` row from an approved request |
| `/api/admin/partners/[id]` | `GET` | Get partner account detail |
| `/api/admin/partners/[id]/generate-login-link` | `POST` | Generate a one-time partner login link (7-day expiry, hash stored only) |

### Partner

| Route | Method | Description |
|---|---|---|
| `/api/partner/logout` | `POST` | Clear partner session cookie |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values.

| Variable | Required | Description |
|---|---|---|
| `LIF_ADMIN_PASSWORD` | Yes | Password for the internal admin area at `/admin/login` — **server only** |
| `LIF_ADMIN_SESSION_SECRET` | Recommended | HMAC SHA-256 signing secret for admin session tokens. Falls back to `LIF_ADMIN_PASSWORD` if not set. Generate: `openssl rand -base64 48`. **Server only.** |
| `LIF_PARTNER_SESSION_SECRET` | Yes | HMAC SHA-256 signing secret for partner session tokens. Generate: `openssl rand -base64 48`. **Server only.** |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key — **server only** |

---

## Database Migrations

Run migrations in order against your Supabase project.

### Migration Files

| File | Description |
|---|---|
| `sql/section01_partner_access_requests.sql` | `partner_access_requests` table — public intake form submissions |
| `sql/section02_partner_request_admin_review.sql` | Adds `internal_notes` column and confirms status constraint |
| `sql/section03_partner_accounts.sql` | `partner_accounts` and `partner_login_tokens` tables |

### Option A — Supabase SQL Editor (recommended)

1. Open your Supabase project → SQL Editor
2. Run each file in order (section01, section02, section03)

### Option B — psql CLI

```bash
psql "postgresql://postgres:[password]@[host]:5432/postgres" \
  -f sql/section01_partner_access_requests.sql \
  -f sql/section02_partner_request_admin_review.sql \
  -f sql/section03_partner_accounts.sql
```

---

## Partner Login Flow

1. Admin reviews a partner request in `/admin/partner-requests`
2. Admin clicks **Create Partner Account** — creates a row in `partner_accounts`
3. Admin clicks **Generate Partner Login Link** — generates a one-time 7-day login URL
4. Admin copies and sends the link to the partner via email
5. Partner visits the link → `/partner/login?token=<raw_token>`
6. Server hashes the token, looks up the hash in `partner_login_tokens`, validates expiry and used status
7. Token is marked as used, `last_login_at` is updated, a 30-day signed session cookie is set
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

This project is Vercel-compatible. Connect the GitHub repository to Vercel and add the required environment variables in the Vercel project settings.

---

## Contact

Partner inquiries: partners@legalintakeflow.com
Legal: legal@legalintakeflow.com
