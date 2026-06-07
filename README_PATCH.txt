Partner login code account lookup fix

Replace this file in the repo:
app/api/partner/request-login/route.ts

What it fixes:
- If the same email exists on more than one partner account, the login route no longer stops at an older inactive/suspended account.
- It checks all active/pending users with that email and selects the first one attached to an active/pending partner account.
- It also normalizes partner account status before checking active/pending.

SQL migration needed: No
Vercel ENV needed: No
