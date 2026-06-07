Partner login code account lookup fix 2

Fixes the Vercel TypeScript build error in app/api/partner/request-login/route.ts:

  'account' is possibly 'null'

The matching loop now explicitly checks `account && accountIsAllowed(account)` before reading account.id.

SQL migration needed: No
Vercel ENV needed: No
