-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 23 MIGRATION
-- Partner Invoice Disputes & Admin Resolution Workflow
-- =============================================================================

-- This phase adds a structured dispute/question workflow for partner invoices.
-- It does not add Stripe, payment processing, automatic credits, or invoice sending.

CREATE TABLE IF NOT EXISTS public.partner_billing_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  partner_user_id uuid NULL REFERENCES public.partner_users(id) ON DELETE SET NULL,
  invoice_id uuid NOT NULL REFERENCES public.partner_billing_invoices(id) ON DELETE CASCADE,
  invoice_item_id uuid NULL REFERENCES public.partner_billing_invoice_items(id) ON DELETE SET NULL,
  lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,

  reason text NOT NULL,
  details text NULL,
  status text NOT NULL DEFAULT 'open',

  admin_resolution_notes text NULL,
  resolved_at timestamptz NULL,
  resolved_by text NULL,

  CONSTRAINT valid_partner_billing_dispute_status CHECK (
    status IN ('open', 'in_review', 'resolved', 'declined')
  ),
  CONSTRAINT valid_partner_billing_dispute_reason CHECK (
    reason IN ('question', 'duplicate', 'wrong_amount', 'not_billable', 'lead_quality', 'other')
  )
);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_partner_billing_disputes_updated_at ON public.partner_billing_disputes;
CREATE TRIGGER set_partner_billing_disputes_updated_at
BEFORE UPDATE ON public.partner_billing_disputes
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_partner_billing_disputes_partner
  ON public.partner_billing_disputes (partner_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_billing_disputes_invoice
  ON public.partner_billing_disputes (invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_billing_disputes_status
  ON public.partner_billing_disputes (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_billing_disputes_user
  ON public.partner_billing_disputes (partner_user_id)
  WHERE partner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_billing_disputes_lead
  ON public.partner_billing_disputes (lead_id)
  WHERE lead_id IS NOT NULL;

-- Allow dispute updates in the existing invoice event log.
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
      'due_date_updated',
      'dispute_updated'
    )
  );

-- =============================================================================
-- Migration complete.
-- =============================================================================
