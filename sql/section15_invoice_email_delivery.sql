-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 21 MIGRATION
-- Invoice Email Delivery & Statement Notifications
-- =============================================================================

-- This phase adds invoice email delivery tracking. It does not add Stripe,
-- payment processing, automatic charges, or payment links.

ALTER TABLE public.partner_billing_invoices
  ADD COLUMN IF NOT EXISTS invoice_email_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS invoice_email_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.email_notifications
  ADD COLUMN IF NOT EXISTS invoice_id uuid NULL REFERENCES public.partner_billing_invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_invoice_id
  ON public.email_notifications (invoice_id)
  WHERE invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_email_sent_at
  ON public.partner_billing_invoices (invoice_email_sent_at DESC)
  WHERE invoice_email_sent_at IS NOT NULL;

-- Allow invoice email audit events in the existing invoice event log.
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
      'email_sent'
    )
  );

-- =============================================================================
-- Migration complete.
-- =============================================================================
