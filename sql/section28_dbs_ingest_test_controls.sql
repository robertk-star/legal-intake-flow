-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 52 MIGRATION
-- DBS Ingest Test Controls / Dry-Run Diagnostics
-- =============================================================================

-- Adds dry-run/test visibility to the LIF-side DBS ingest diagnostics table.
-- Safe to run after section27. This does not alter lead records or partner flows.

ALTER TABLE public.dbs_ingest_events
  ADD COLUMN IF NOT EXISTS is_dry_run boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS dry_run_result text NULL,
  ADD COLUMN IF NOT EXISTS dry_run_checked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS raw_payload_summary jsonb NULL;

ALTER TABLE public.dbs_ingest_events
  DROP CONSTRAINT IF EXISTS valid_dbs_ingest_event_result;

ALTER TABLE public.dbs_ingest_events
  ADD CONSTRAINT valid_dbs_ingest_event_result CHECK (
    ingest_result IN (
      'created',
      'duplicate',
      'rejected',
      'failed',
      'received',
      'dry_run'
    )
  );

ALTER TABLE public.dbs_ingest_events
  DROP CONSTRAINT IF EXISTS valid_dbs_ingest_dry_run_result;

ALTER TABLE public.dbs_ingest_events
  ADD CONSTRAINT valid_dbs_ingest_dry_run_result CHECK (
    dry_run_result IS NULL
    OR dry_run_result IN (
      'would_create',
      'would_duplicate',
      'would_reject',
      'would_fail_validation'
    )
  );

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_is_dry_run
  ON public.dbs_ingest_events (is_dry_run, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_dry_run_result
  ON public.dbs_ingest_events (dry_run_result)
  WHERE dry_run_result IS NOT NULL;

-- =============================================================================
-- Migration complete.
-- =============================================================================
