-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 33 MIGRATION
-- Billing Finalization Prep
-- =============================================================================

-- This phase adds invoice finalization, manual payment instructions, and
-- payment-reference tracking. It does not add Stripe, payment processing,
-- automatic charges, or payment links.

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS finalized_at timestamptz NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS finalized_by text NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS payment_instructions text NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS payment_method text NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS payment_reference text NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS payment_received_at timestamptz NULL;

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS payment_recorded_by text NULL;

-- Allow new invoice event types while preserving all prior event types added by
-- earlier billing/email/reminder/dispute phases.
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
      'due_date_updated',
      'dispute_updated',
      'reminder_sent',
      'finalized',
      'payment_instructions_updated',
      'payment_reference_updated'
    )
  );

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_finalized_at
  ON public.partner_billing_invoices (finalized_at DESC)
  WHERE finalized_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_payment_received_at
  ON public.partner_billing_invoices (payment_received_at DESC)
  WHERE payment_received_at IS NOT NULL;
