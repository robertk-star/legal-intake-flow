-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 38 MIGRATION
-- DBS Ingest Receipt Hardening
-- =============================================================================

-- Adds explicit DBS receipt/consent metadata to public.leads.
-- This keeps DBS report numbers and consent confirmation visible/searchable in
-- LIF while preserving source + external_reference_id as the duplicate key.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dbs_report_number text NULL,
  ADD COLUMN IF NOT EXISTS dbs_consent_given boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dbs_consent_source text NULL,
  ADD COLUMN IF NOT EXISTS dbs_consent_timestamp timestamptz NULL,
  ADD COLUMN IF NOT EXISTS dbs_received_at timestamptz NULL;

-- Backfill DBS receipt timestamp for existing DBS-sourced leads if they do not
-- already have one. This is a receipt/display field only; created_at remains
-- the original LIF record creation timestamp.
UPDATE public.leads
SET dbs_received_at = COALESCE(dbs_received_at, created_at)
WHERE source = 'disabilitybenefitsscreening'
  AND dbs_received_at IS NULL;

-- Backfill DBS consent flag from any existing consent_given value when present.
UPDATE public.leads
SET dbs_consent_given = true
WHERE source = 'disabilitybenefitsscreening'
  AND consent_given = true
  AND dbs_consent_given = false;

-- Helpful indexes for admin lookup/search.
CREATE INDEX IF NOT EXISTS idx_leads_dbs_report_number
  ON public.leads (dbs_report_number)
  WHERE dbs_report_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_dbs_received_at
  ON public.leads (dbs_received_at DESC)
  WHERE dbs_received_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_dbs_consent_given
  ON public.leads (dbs_consent_given)
  WHERE source = 'disabilitybenefitsscreening';

-- =============================================================================
-- Migration complete.
-- =============================================================================
