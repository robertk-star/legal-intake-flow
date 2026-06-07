-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 20 MIGRATION
-- Invoice Drafts & Payment Tracking Foundation
-- =============================================================================

-- This phase adds internal invoice draft records and payment-status tracking.
-- It does not add Stripe, payment processing, automatic charges, or invoice emails.

CREATE TABLE IF NOT EXISTS public.partner_billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,

  invoice_number text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'draft',

  period_start date NOT NULL,
  period_end date NOT NULL,

  subtotal_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  balance_due_cents integer NOT NULL DEFAULT 0,

  notes text NULL,
  created_by text NULL,

  sent_at timestamptz NULL,
  paid_at timestamptz NULL,
  voided_at timestamptz NULL,

  CONSTRAINT valid_partner_billing_invoice_status CHECK (
    status IN ('draft', 'sent', 'partially_paid', 'paid', 'void')
  ),
  CONSTRAINT valid_partner_billing_invoice_amounts CHECK (
    subtotal_cents >= 0 AND total_cents >= 0 AND amount_paid_cents >= 0 AND balance_due_cents >= 0
  ),
  CONSTRAINT valid_partner_billing_invoice_period CHECK (period_end >= period_start)
);

CREATE TABLE IF NOT EXISTS public.partner_billing_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  invoice_id uuid NOT NULL REFERENCES public.partner_billing_invoices(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE RESTRICT,

  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  billing_status_at_creation text NULL,

  CONSTRAINT valid_partner_billing_invoice_item_amount CHECK (amount_cents >= 0),
  CONSTRAINT unique_invoice_lead_item UNIQUE (invoice_id, lead_id)
);

CREATE TABLE IF NOT EXISTS public.partner_billing_invoice_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  invoice_id uuid NOT NULL REFERENCES public.partner_billing_invoices(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  previous_status text NULL,
  next_status text NULL,
  amount_cents integer NULL,
  notes text NULL,
  created_by text NULL,

  CONSTRAINT valid_partner_billing_invoice_event_type CHECK (
    event_type IN ('created', 'status_changed', 'payment_recorded', 'payment_adjusted', 'voided', 'note_updated')
  )
);

-- Keep invoice updated_at fresh.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_partner_billing_invoices_updated_at ON public.partner_billing_invoices;
CREATE TRIGGER set_partner_billing_invoices_updated_at
BEFORE UPDATE ON public.partner_billing_invoices
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_partner
  ON public.partner_billing_invoices (partner_account_id);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_status
  ON public.partner_billing_invoices (status);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_period
  ON public.partner_billing_invoices (period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoices_created_at
  ON public.partner_billing_invoices (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoice_items_invoice
  ON public.partner_billing_invoice_items (invoice_id);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoice_items_lead
  ON public.partner_billing_invoice_items (lead_id);

CREATE INDEX IF NOT EXISTS idx_partner_billing_invoice_events_invoice
  ON public.partner_billing_invoice_events (invoice_id, created_at DESC);
