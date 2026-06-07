-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 39 MIGRATION
-- Lead Deletion + DBS Duplicate Reset
-- =============================================================================

-- Adds soft-delete fields so an admin can remove a lead from active LIF views
-- while freeing the original DBS duplicate key for a future re-send.
-- The DELETE API changes external_reference_id on the deleted row and stores the
-- original value separately, so source + external_reference_id no longer blocks
-- a future DBS handoff for the same lead.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by text NULL,
  ADD COLUMN IF NOT EXISTS deletion_reason text NULL,
  ADD COLUMN IF NOT EXISTS original_external_reference_id text NULL,
  ADD COLUMN IF NOT EXISTS original_dbs_report_number text NULL;

CREATE INDEX IF NOT EXISTS idx_leads_deleted_at
  ON public.leads (deleted_at)
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_active_created_at
  ON public.leads (created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_original_external_reference_id
  ON public.leads (original_external_reference_id)
  WHERE original_external_reference_id IS NOT NULL;

-- Optional admin audit table for deletion/reset actions.
CREATE TABLE IF NOT EXISTS public.lead_deletion_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  deleted_by text NULL,
  deletion_reason text NULL,
  original_source text NULL,
  original_external_reference_id text NULL,
  reset_external_reference_id text NULL,
  original_dbs_report_number text NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_deletion_events_lead_id
  ON public.lead_deletion_events (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_deletion_events_created_at
  ON public.lead_deletion_events (created_at DESC);

-- =============================================================================
-- Migration complete.
-- =============================================================================
