# Partner Email Code Login

This update changes partner/client login from automatic magic-link email to a code-based login flow.

## Partner login flow

1. Partner opens `/partner/login`.
2. Partner enters email address.
3. LIF emails a 6-digit login code if the email matches an active/pending partner user.
4. Partner enters the code on the login page.
5. LIF creates the partner session and redirects to `/partner/dashboard`.

Existing one-time token links remain supported for admin/team invitations.

## SQL required

Run:

```text
sql/section30_partner_login_email_codes.sql
```

## Vercel ENV required

No new ENV is required if email sending is already configured:

```text
RESEND_API_KEY
LIF_EMAIL_FROM
LIF_PARTNER_SESSION_SECRET
```

Recommended existing values:

```text
LIF_EMAIL_REPLY_TO
LIF_APP_URL
```

## Files changed

- `app/partner/login/page.tsx`
- `app/api/partner/request-login/route.ts`
- `app/api/partner/verify-login-code/route.ts`
- `lib/emailNotifications.ts`
- `sql/section30_partner_login_email_codes.sql`
