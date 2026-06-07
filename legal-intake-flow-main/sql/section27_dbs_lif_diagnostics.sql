-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 51 MIGRATION
-- End-to-End DBS/LIF Diagnostics & Send Audit
-- =============================================================================

-- This table records DBS ingest attempts observed by LIF after the request has
-- passed the shared-secret gate. It is designed as a non-blocking audit/diagnostic
-- layer for handoff troubleshooting.

CREATE TABLE IF NOT EXISTS public.dbs_ingest_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  source text NOT NULL DEFAULT 'disabilitybenefitsscreening',
  external_reference_id text NULL,
  dbs_report_number text NULL,
  lif_lead_id uuid NULL REFERENCES public.leads(id) ON DELETE SET NULL,

  ingest_result text NOT NULL DEFAULT 'received',
  status_code integer NULL,
  error_message text NULL,

  consent_given boolean NULL,
  consent_source text NULL,
  consent_timestamp timestamptz NULL,
  received_at timestamptz NULL,

  duplicate boolean NOT NULL DEFAULT false,
  auto_assignment_enabled boolean NULL,
  auto_assign_new_dbs_leads boolean NULL,
  auto_assignment_result jsonb NULL,
  assigned_partner_account_id uuid NULL REFERENCES public.partner_accounts(id) ON DELETE SET NULL,

  raw_payload jsonb NULL,
  response_summary jsonb NULL
);

ALTER TABLE public.dbs_ingest_events
  DROP CONSTRAINT IF EXISTS valid_dbs_ingest_event_result;

ALTER TABLE public.dbs_ingest_events
  ADD CONSTRAINT valid_dbs_ingest_event_result CHECK (
    ingest_result IN (
      'created',
      'duplicate',
      'rejected',
      'failed',
      'received'
    )
  );

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_created_at
  ON public.dbs_ingest_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_external_reference
  ON public.dbs_ingest_events (external_reference_id)
  WHERE external_reference_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_report_number
  ON public.dbs_ingest_events (dbs_report_number)
  WHERE dbs_report_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_result
  ON public.dbs_ingest_events (ingest_result);

CREATE INDEX IF NOT EXISTS idx_dbs_ingest_events_lif_lead
  ON public.dbs_ingest_events (lif_lead_id)
  WHERE lif_lead_id IS NOT NULL;

-- =============================================================================
-- Migration complete.
-- =============================================================================
