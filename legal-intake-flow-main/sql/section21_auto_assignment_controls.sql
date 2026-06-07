-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 31 MIGRATION
-- Automated Lead Assignment Controls
-- =============================================================================

-- Stores the admin-controlled switches for safe automated assignment.
-- This is intentionally a singleton settings table.
CREATE TABLE IF NOT EXISTS public.lead_assignment_settings (
  id text PRIMARY KEY DEFAULT 'default',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  auto_assignment_enabled boolean NOT NULL DEFAULT false,
  auto_assign_new_dbs_leads boolean NOT NULL DEFAULT false,
  notify_partner_on_auto_assignment boolean NOT NULL DEFAULT true,
  require_no_blockers boolean NOT NULL DEFAULT true,
  minimum_score integer NOT NULL DEFAULT 85,

  updated_by text NULL,
  notes text NULL,

  CONSTRAINT lead_assignment_settings_singleton CHECK (id = 'default'),
  CONSTRAINT lead_assignment_minimum_score_range CHECK (minimum_score >= 0 AND minimum_score <= 1000)
);

INSERT INTO public.lead_assignment_settings (id)
VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- Keep updated_at current.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_assignment_settings_updated_at ON public.lead_assignment_settings;
CREATE TRIGGER trg_lead_assignment_settings_updated_at
BEFORE UPDATE ON public.lead_assignment_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_lead_assignment_settings_updated_at
  ON public.lead_assignment_settings (updated_at DESC);

-- Expand assignment event types for controlled automation events.
ALTER TABLE public.lead_assignment_events DROP CONSTRAINT IF EXISTS valid_lead_assignment_type;
ALTER TABLE public.lead_assignment_events ADD CONSTRAINT valid_lead_assignment_type
  CHECK (assignment_type IN ('manual', 'best_match', 'reassignment', 'auto_ingest', 'auto_batch'));
