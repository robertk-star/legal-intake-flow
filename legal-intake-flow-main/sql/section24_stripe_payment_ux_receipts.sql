-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 35 MIGRATION
-- Stripe Payment UX & Receipt Tracking
-- =============================================================================

-- Adds Stripe receipt and card/payment-method metadata captured from successful
-- Checkout payments. Safe to run after section23.

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS stripe_charge_id text NULL,
  ADD COLUMN IF NOT EXISTS stripe_receipt_url text NULL,
  ADD COLUMN IF NOT EXISTS stripe_payment_method_type text NULL,
  ADD COLUMN IF NOT EXISTS stripe_card_last4 text NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_stripe_charge
  ON public.partner_billing_invoices (stripe_charge_id)
  WHERE stripe_charge_id IS NOT NULL;

-- Preserve all previous invoice event types. No new event type is required for
-- this phase because receipt metadata is attached to stripe_payment_succeeded.

-- =============================================================================
-- Migration complete.
-- =============================================================================
