-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 34 MIGRATION
-- Stripe Payment Option
-- =============================================================================

-- This phase adds optional Stripe Checkout payment tracking for partner invoices.
-- It does not enable automatic charges. Partners must click Pay Online.

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_url text NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_status text NULL,
  ADD COLUMN IF NOT EXISTS stripe_customer_email text NULL,
  ADD COLUMN IF NOT EXISTS stripe_paid_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS stripe_last_event_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_stripe_checkout_session
  ON public.partner_billing_invoices (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_stripe_payment_intent
  ON public.partner_billing_invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_stripe_paid_at
  ON public.partner_billing_invoices (stripe_paid_at DESC)
  WHERE stripe_paid_at IS NOT NULL;

-- Allow Stripe-related invoice audit events while preserving all previous events.
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
      'payment_reference_updated',
      'stripe_checkout_created',
      'stripe_payment_succeeded',
      'stripe_payment_failed'
    )
  );

-- =============================================================================
-- Migration complete.
-- =============================================================================
