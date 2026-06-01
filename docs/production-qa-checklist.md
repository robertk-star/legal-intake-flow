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

## Phase 20 — Invoice Drafts & Payment Tracking QA

1. Run `sql/section14_invoice_drafts.sql` in Supabase.
2. Confirm at least one assigned lead is marked `billable` with a billing amount.
3. Open `/admin/billing/invoices`.
4. Click **Create Draft**.
5. Select a partner and date range with billable leads.
6. Confirm a draft invoice is created.
7. Open the invoice and confirm invoice items appear.
8. Update invoice status to `sent` and save.
9. Confirm the related lead billing status changes to `invoiced`.
10. Record a partial or full payment amount and confirm balance due updates.
11. Open `/partner/invoices` as that partner and confirm sent/paid invoices are visible.
12. Export invoice CSV as admin and as partner.

No Stripe, payment processing, automatic invoice emails, or automatic charges should be present.

## Phase 21 — Invoice Email Delivery QA

1. Run `sql/section15_invoice_email_delivery.sql` in Supabase.
2. Confirm `RESEND_API_KEY` and `LIF_EMAIL_FROM` are configured in Vercel if testing live email delivery.
3. Open `/admin/billing/invoices`.
4. Open an invoice with status `draft`, `sent`, or `partially_paid`.
5. Click **Send Invoice Email**.
6. Confirm the success/skipped/failure message appears.
7. Confirm the invoice detail shows updated email count and last sent timestamp when delivery succeeds.
8. Open `/admin/notifications` and confirm an `Invoice Sent` notification row appears.
9. Log in as the partner and confirm the invoice remains visible at `/partner/invoices`.
10. Confirm no Stripe, payment link, automatic charge, or invoice automation was added.

## Phase 22 — Invoice Reminder & Overdue Tracking QA

1. Run `sql/section16_invoice_reminders_overdue.sql` in Supabase.
2. Open `/admin/billing/invoices`.
3. Open an invoice with a balance due.
4. Set or confirm a due date.
5. Save the invoice.
6. Click **Send Reminder**.
7. Confirm the modal shows sent/skipped/failed counts.
8. Open `/admin/notifications` and confirm an **Invoice Reminder** notification row appears.
9. Log in as the partner and open `/partner/invoices`.
10. Confirm due date and reminder count are visible.

No Stripe, payment links, payment processing, automatic charges, public LIF intake, or DBS frontend code should be present.

## Phase 23 — Invoice Disputes QA

1. Run `sql/section17_invoice_disputes.sql` in Supabase.
2. Log in as a partner and open `/partner/invoices`.
3. Click `Question` on an invoice.
4. Submit a billing review request with a reason and details.
5. Confirm the request appears in the partner invoice dispute summary.
6. Log in as admin and open `/admin/billing/disputes`.
7. Open the dispute, set status to `in_review`, and save resolution notes.
8. Set status to `resolved` or `declined` and confirm the partner can see the admin response.
9. Confirm no invoice balance changes automatically.

## Phase 24 — Partner Team Management QA

Required setup:

- Run `sql/section18_partner_team_management.sql` in Supabase.
- No new Vercel environment variable is required.
- Invitation emails require the existing email setup: `RESEND_API_KEY` and `LIF_EMAIL_FROM`.

Test checklist:

1. Log in as a partner owner/admin.
2. Open `/partner/team`.
3. Confirm existing partner users display.
4. Add a pending staff user.
5. Send invitation.
6. Confirm the invitation sends or returns a copyable one-time login link if email is skipped.
7. Open the invite link in an incognito window and confirm the new user can log in.
8. Confirm owner/admin can edit role/status.
9. Confirm staff/viewer users can view the team list but cannot add/edit/send invitations.
10. Confirm the system prevents removing the last active/pending owner.

## Phase 25 — Partner Firm Profile & Billing Contact QA

Required setup:

- Run `sql/section19_partner_profile_billing_contacts.sql` in Supabase.
- No new Vercel environment variable is required.

Checks:

1. Log in as a partner owner/admin.
2. Open `/partner/account`.
3. Confirm the Firm Profile & Billing Contact card appears.
4. Update firm phone, website, billing contact name/email, billing address, and billing notes.
5. Save and confirm the success message appears.
6. Reload the page and confirm the saved values persist.
7. Log in as a staff/viewer partner user and confirm the fields are visible but disabled.
8. Open `/admin/partners`, view the partner account, and confirm the billing contact section shows the partner-maintained values.

## Phase 26 — Partner Profile UX Cleanup & Change History QA

1. Run `sql/section20_partner_profile_ux_audit.sql` in Supabase.
2. Log in as a partner owner/admin.
3. Open `/partner/account`.
4. Enter a website as a bare domain, for example `saffhire.com`.
5. Click **Save Firm Profile**.
6. Confirm the profile saves and the website is stored/displayed as `https://saffhire.com`.
7. Log in as admin and open `/admin/partners`.
8. Open the same partner account.
9. Confirm **Profile Change History** shows the changed profile fields.
10. Open `/admin/system-check` and confirm the partner profile change history table passes.

## Phase 27 — Admin Activity Timeline QA

1. Log in as admin.
2. Open `/admin/activity`.
3. Confirm the timeline loads.
4. Confirm filters work for:
   - All Activity
   - Assignments
   - Emails
   - Lead Billing
   - Invoices
   - Disputes
   - Profiles
5. Trigger one or more existing system events, such as sending an invoice reminder or editing a partner profile.
6. Refresh `/admin/activity` and confirm the new event appears.
7. Confirm no secret values are displayed in event details.


## Phase 28 — Admin Data Export Center

- Open `/admin/exports`.
- Confirm the export catalog loads.
- Export Leads for the last 30 days.
- Export Partner Accounts.
- Export Invoices or Notifications if records exist.
- Confirm downloaded CSV files open correctly.
- Confirm non-admin users cannot access `/api/admin/exports` or `/api/admin/exports/download`.
- Confirm no new SQL migration or Vercel ENV is required.

---

## Phase 29 — Partner Onboarding Dashboard QA

1. Log in as a partner owner or admin.
2. Open `/partner/dashboard`.
3. Confirm the dashboard loads and shows:
   - setup readiness percentage
   - onboarding checklist
   - assigned leads count
   - new leads count
   - open invoices count
   - open disputes count
   - routing readiness summary
   - team access summary
4. Open `/partner` directly and confirm it redirects to `/partner/dashboard`.
5. Confirm partner navigation shows Dashboard, Account, Leads, Billing, Invoices, and Team.
6. Update partner profile, routing preferences, billing contact, or team users and confirm the checklist/readiness score changes as expected.
7. Log in as a staff/viewer user and confirm the dashboard is visible but management links still respect existing role permissions on target pages.

## Phase 30 — Admin Dashboard Home QA

1. Log in as admin.
2. Open `/admin`.
3. Confirm the dashboard loads without exposing secret values.
4. Confirm the Action Center counts match the relevant admin areas:
   - new leads in `/admin/leads`
   - failed emails in `/admin/notifications`
   - overdue invoices in `/admin/billing/invoices`
   - open disputes in `/admin/billing/disputes`
5. Confirm navigation includes Dashboard on major admin pages.
6. Confirm non-admin users are redirected or blocked from `GET /api/admin/dashboard`.

---

## Phase 31 — Automated Lead Assignment Controls QA

Before testing:

- Run `sql/section21_auto_assignment_controls.sql` in Supabase.
- No new Vercel ENV variables are required.

Test checklist:

1. Log in as admin.
2. Open `/admin/routing`.
3. Confirm routing controls load.
4. Confirm auto-assignment is off by default.
5. Enable `Enable auto-assignment controls`.
6. Save settings.
7. Click `Run Now`.
8. Confirm unassigned leads are assigned only if they have eligible partners.
9. Enable `Auto-assign newly ingested DBS leads`.
10. Submit a test lead through `/api/intake/ingest` with a unique external reference.
11. Confirm the lead is assigned automatically only when it meets routing criteria.
12. Confirm the assignment event is logged with `auto_ingest` or `auto_batch`.
13. Confirm partner sees assigned lead on `/partner/leads`.

Safety checks:

- Disable auto-ingest again if you do not want live DBS leads auto-assigned.
- Confirm no public LIF intake route exists.
- Confirm manual assignment still works.

## Phase 32 — Partner Performance Reporting QA

1. Log in as a partner user.
2. Open `/partner/reports`.
3. Confirm the report dashboard loads.
4. Change the date range and click **Refresh Reports**.
5. Confirm lead counts roughly match `/partner/leads` for the selected period.
6. Confirm billing/invoice/dispute summaries match `/partner/billing` and `/partner/invoices`.
7. Confirm a partner cannot access another partner account's reporting data.
8. Confirm no new SQL migration or Vercel environment variable is required.

## Phase 33 — Billing Finalization Prep QA

1. Run `sql/section22_billing_finalization.sql` in Supabase.
2. Open `/admin/billing/invoices`.
3. Open a draft invoice.
4. Add payment instructions, such as check mailing or ACH instructions.
5. Click **Finalize & Mark Sent**.
6. Confirm the invoice shows a finalized date and status `sent`.
7. Confirm the invoice cannot be returned to `draft`.
8. Log in as the partner and open `/partner/invoices`.
9. Confirm the invoice is visible and payment instructions appear.
10. Export invoice CSV from admin and partner views and confirm finalization/payment-reference fields appear.

No Stripe/payment processing should be present.

## Phase 34 — Stripe Payment Option QA

Before testing:

1. Run `sql/section23_stripe_payment_option.sql` in Supabase.
2. Add `STRIPE_SECRET_KEY` in Vercel.
3. Add `STRIPE_WEBHOOK_SECRET` in Vercel.
4. Confirm `LIF_APP_URL=https://legalintakeflow.com` is set.
5. Redeploy LIF.
6. Configure Stripe webhook endpoint: `https://legalintakeflow.com/api/stripe/webhook` for `checkout.session.completed`.

Test flow:

1. Create/finalize/send an invoice with a balance due.
2. Log in as the partner.
3. Open `/partner/invoices`.
4. Click **Pay Online**.
5. Complete payment with a Stripe test card if using test mode.
6. Return to `/partner/invoices`.
7. Confirm invoice status updates to paid or partially paid after webhook processing.
8. Confirm admin invoice detail shows Stripe payment status, payment intent, and invoice event log entry.


## Phase 35 Stripe Payment UX & Receipt Tracking QA

- Run `sql/section24_stripe_payment_ux_receipts.sql` in the LIF Supabase project.
- Confirm Stripe ENV values are configured for the intended mode.
- Optional: set `STRIPE_CHECKOUT_ALLOW_LINK=false` in Vercel and redeploy to request card-only Checkout.
- Pay an invoice through Stripe Checkout.
- Confirm admin invoice detail shows charge ID, payment method, and receipt link.
- Confirm partner invoice list shows a Receipt link after payment.
- Confirm no automatic charges are created; partners still must click Pay Online.
