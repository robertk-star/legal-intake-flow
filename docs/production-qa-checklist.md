# Legal Intake Flow — Production QA Checklist

Use this checklist after each deployment and after every new SQL migration or Vercel environment variable change.

## 1. Required setup

- Confirm Vercel deployment completed successfully.
- Run any new SQL migration in Supabase before testing the feature that depends on it.
- Add any new Vercel environment variables before testing and redeploy after adding them.
- Open `/admin/system-check` and confirm no required checks are failing.

## 2. Partner onboarding and admin review

- Submit `/request-access` with a test partner request.
- Log in at `/admin/login`.
- Open `/admin/partner-requests`.
- Confirm the request appears.
- Update status and internal notes.
- Approve the request.
- Create a partner account.
- Confirm an owner partner user exists.
- Generate a partner login link.

## 3. Partner account and users

- Log in with the partner login link.
- Confirm `/partner/account` loads.
- Confirm the signed-in user badge is visible.
- Update lead preferences and routing states.
- Log out and request a new login link from `/partner/login`.
- Confirm the login request appears in `/admin/partners`.
- Add a second partner user from `/admin/partners`.
- Generate a login link for that user.

## 4. DBS lead ingestion

- Confirm `LIF_DBS_INGEST_SECRET` is configured in Vercel.
- Send a test lead to `POST /api/intake/ingest` with the `x-lif-ingest-secret` header.
- Confirm unauthorized requests are rejected.
- Confirm duplicate `source + external_reference_id` requests return the existing lead instead of creating duplicates.
- Confirm the lead appears in `/admin/leads`.

## 5. Lead review and assignment

- Open the test lead from `/admin/leads`.
- Confirm source, external reference, raw payload, and claimant details display.
- Confirm Routing Eligibility Preview appears.
- Manually assign the lead to a partner and save.
- Reopen the lead and confirm assignment persisted.
- Use Assign Best Match on another test lead and confirm assignment persisted.

## 6. Partner lead dashboard

- Log in as the assigned partner.
- Open `/partner/leads`.
- Confirm the assigned lead appears.
- Open the lead detail.
- Update partner response status and partner notes.
- Confirm viewer-role users cannot update lead status or notes.
- Return to `/admin/leads` and confirm partner response fields are visible.

## 7. Email notifications

- Confirm `RESEND_API_KEY` and `LIF_EMAIL_FROM` are configured before expecting live emails.
- Request a partner login link from `/partner/login`.
- Confirm email send attempt appears in `/admin/notifications`.
- Assign or reassign a lead and confirm assignment email attempts are logged.
- Use Send Assignment Email from the lead detail modal and confirm status is logged.

## 8. Reports

- Open `/admin/reports`.
- Confirm lead, assignment, partner, coverage, and notification sections load.
- Compare counts against `/admin/leads`, `/admin/partners`, and `/admin/notifications`.

## 9. Safety checks

- Confirm `/apply` is not active on LIF.
- Confirm `/api/intake/submit` is not active on LIF.
- Confirm admin pages require admin login.
- Confirm partner pages require partner login.
- Confirm a partner cannot see another partner account's assigned leads.
- Confirm no `.env.local`, `.next`, `node_modules`, or TypeScript build info files are committed.

---

## Phase 17 — Billing Readiness QA

1. Run `sql/section13_billing_readiness.sql` in Supabase.
2. Open `/admin/billing` as admin.
3. Confirm assigned partner leads load.
4. Open a lead with **Review**.
5. Change billable status to `billable`.
6. Add a billing amount and internal billing notes.
7. Save and confirm the row updates.
8. Confirm recent billing event appears on the page.
9. Confirm no invoice, Stripe payment, or automatic charge is created.

## Phase 18 — Partner Billing Statements QA

1. Confirm `sql/section13_billing_readiness.sql` has already been run. No new SQL is required for Phase 18.
2. Open `/admin/billing/statements` as admin.
3. Confirm the page loads with the current month date range.
4. Confirm partner statement totals appear for billable/invoiced leads.
5. Change the date range and refresh.
6. Filter by a single partner and confirm only that partner appears.
7. Toggle included billing statuses and confirm totals update.
8. Expand a partner statement and confirm individual leads display.
9. Click **Export CSV** and confirm a CSV downloads.
10. Confirm no invoice email, Stripe payment, or automatic charge is created.

---

## Phase 19 — Partner Billing Portal QA

1. Confirm Phase 17 SQL has already been run:
   - `sql/section13_billing_readiness.sql`
2. In admin, open `/admin/billing` and mark at least one assigned lead as `billable` or `invoiced` with an amount.
3. Log in as the assigned partner.
4. Open `/partner/billing`.
5. Confirm the partner sees only billing records for their own partner account.
6. Confirm the billing totals match the selected date range and statuses.
7. Change the date range and included statuses, then refresh.
8. Export CSV and confirm it downloads.
9. Confirm the partner cannot edit billing status, amounts, or billing notes.
10. Confirm no payment, Stripe, invoice sending, or public claimant intake behavior was added.
