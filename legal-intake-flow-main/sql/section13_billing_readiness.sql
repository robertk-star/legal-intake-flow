-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 17 MIGRATION
-- Billing Readiness & Partner Lead Disposition Reporting
-- =============================================================================

-- This migration adds admin-reviewed billing readiness fields to DBS-ingested leads.
-- It does not add Stripe, payments, invoices, or automatic charges.

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billable_status text NOT NULL DEFAULT 'not_reviewed';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_amount_cents integer NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_notes text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_reviewed_at timestamptz NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_reviewed_by text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS billing_updated_at timestamptz NULL;

-- Backfill leads that look ready for billing review based on partner disposition.
UPDATE public.leads
SET billable_status = 'review_needed'
WHERE billable_status = 'not_reviewed'
  AND partner_response_status IN ('accepted', 'retained');

-- Keep status values controlled while allowing future billing phases to build on this safely.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_billable_status;
ALTER TABLE public.leads ADD CONSTRAINT valid_billable_status
  CHECK (billable_status IN (
    'not_reviewed',
    'review_needed',
    'not_billable',
    'billable',
    'invoiced',
    'waived',
    'disputed'
  ));

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_billing_amount_cents;
ALTER TABLE public.leads ADD CONSTRAINT valid_billing_amount_cents
  CHECK (billing_amount_cents IS NULL OR billing_amount_cents >= 0);

CREATE INDEX IF NOT EXISTS idx_leads_billable_status
  ON public.leads (billable_status);

CREATE INDEX IF NOT EXISTS idx_leads_billing_updated_at
  ON public.leads (billing_updated_at DESC)
  WHERE billing_updated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_partner_billing_status
  ON public.leads (assigned_partner_account_id, billable_status)
  WHERE assigned_partner_account_id IS NOT NULL;

-- Billing audit trail. This is an internal history table only; it is not an invoice table.
CREATE TABLE IF NOT EXISTS public.lead_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_account_id uuid NULL REFERENCES public.partner_accounts(id),

  event_type text NOT NULL,
  previous_billable_status text NULL,
  next_billable_status text NULL,
  previous_amount_cents integer NULL,
  next_amount_cents integer NULL,

  notes text NULL,
  created_by text NULL
);

ALTER TABLE public.lead_billing_events DROP CONSTRAINT IF EXISTS valid_lead_billing_event_type;
ALTER TABLE public.lead_billing_events ADD CONSTRAINT valid_lead_billing_event_type
  CHECK (event_type IN (
    'billing_review',
    'status_update',
    'amount_update',
    'notes_update',
    'invoice_marked',
    'waived',
    'disputed'
  ));

CREATE INDEX IF NOT EXISTS idx_lead_billing_events_lead_id
  ON public.lead_billing_events (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_billing_events_partner_account_id
  ON public.lead_billing_events (partner_account_id)
  WHERE partner_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_billing_events_created_at
  ON public.lead_billing_events (created_at DESC);
