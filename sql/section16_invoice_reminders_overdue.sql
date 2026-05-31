-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 22 MIGRATION
-- Invoice Reminder & Overdue Tracking
-- =============================================================================

-- This phase adds invoice due dates and reminder tracking. It does not add
-- Stripe, payment links, payment processing, or automatic charges.

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS due_date date NULL,
  ADD COLUMN IF NOT EXISTS reminder_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS reminder_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS overdue_marked_at timestamptz NULL;

-- Backfill due dates for existing invoices. Default: 30 days after sent_at when
-- available, otherwise 30 days after created_at.
UPDATE public.partner_billing_invoices
SET due_date = COALESCE((sent_at::date + INTERVAL '30 days')::date, (created_at::date + INTERVAL '30 days')::date)
WHERE due_date IS NULL;

-- Mark already overdue open invoices for reporting visibility.
UPDATE public.partner_billing_invoices
SET overdue_marked_at = now()
WHERE overdue_marked_at IS NULL
  AND due_date IS NOT NULL
  AND due_date < CURRENT_DATE
  AND status IN ('sent', 'partially_paid')
  AND balance_due_cents > 0;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_due_date
  ON public.partner_billing_invoices (due_date)
  WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_overdue_open
  ON public.partner_billing_invoices (due_date, partner_account_id)
  WHERE status IN ('sent', 'partially_paid') AND balance_due_cents > 0;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_reminder_sent_at
  ON public.partner_billing_invoices (reminder_sent_at DESC)
  WHERE reminder_sent_at IS NOT NULL;

-- Allow invoice reminder audit events.
ALTER TABLE public.partner_billing_invoice_events
  DROP CONSTRAINT IF EXISTS valid_partner_billing_invoice_event_type;

ALTER TABLE public.partner_billing_invoice_events
  ADD CONSTRAINT valid_partner_billing_invoice_event_type CHECK (
    event_type IN (
      'created',
      'status_changed',
      'payment_recorded',
      'payment_adjusted',
      'voided',
      'note_updated',
      'email_sent',
      'reminder_sent',
      'due_date_updated'
    )
  );

-- =============================================================================
-- Migration complete.
-- =============================================================================
