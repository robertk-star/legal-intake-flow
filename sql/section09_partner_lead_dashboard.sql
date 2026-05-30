-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 11 MIGRATION
-- Partner Lead Dashboard Foundation
-- =============================================================================

-- This migration adds partner-side lead workflow fields to the existing
-- DBS-ingested public.leads table. It is safe to run after section08.

-- Partner notes and partner-side activity timestamps
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS partner_notes text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS partner_response_updated_at timestamptz NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS partner_viewed_at timestamptz NULL;

-- Backfill assigned leads so partners see a clear initial response status.
UPDATE public.leads
SET partner_response_status = 'new'
WHERE assigned_partner_account_id IS NOT NULL
  AND partner_response_status IS NULL;

-- Normalize any unexpected legacy partner response values before adding the constraint.
UPDATE public.leads
SET partner_response_status = 'new'
WHERE partner_response_status IS NOT NULL
  AND partner_response_status NOT IN (
    'new',
    'reviewing',
    'contact_attempted',
    'contacted',
    'accepted',
    'declined',
    'retained',
    'closed'
  );

-- Enforce valid partner-side response statuses while still allowing NULL for unassigned leads.
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_partner_response_status;
ALTER TABLE public.leads ADD CONSTRAINT valid_partner_response_status
  CHECK (
    partner_response_status IS NULL
    OR partner_response_status IN (
      'new',
      'reviewing',
      'contact_attempted',
      'contacted',
      'accepted',
      'declined',
      'retained',
      'closed'
    )
  );

-- Helpful indexes for partner dashboard queries.
CREATE INDEX IF NOT EXISTS idx_leads_partner_response_status
  ON public.leads (partner_response_status)
  WHERE partner_response_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_partner_response_updated_at
  ON public.leads (partner_response_updated_at DESC)
  WHERE partner_response_updated_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_partner_assigned_at
  ON public.leads (assigned_partner_account_id, assigned_at DESC)
  WHERE assigned_partner_account_id IS NOT NULL;
