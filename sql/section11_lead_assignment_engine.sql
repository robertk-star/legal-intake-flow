-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 13 MIGRATION
-- Lead Assignment Engine Audit Trail
-- =============================================================================

-- This migration adds an audit table for admin-triggered lead assignments.
-- Phase 13 does not enable fully automatic routing. Assignments still require
-- an admin action from the Lead Queue.

CREATE TABLE IF NOT EXISTS public.lead_assignment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  partner_account_id uuid NULL REFERENCES public.partner_accounts(id),
  previous_partner_account_id uuid NULL REFERENCES public.partner_accounts(id),

  assignment_type text NOT NULL DEFAULT 'manual',
  score integer NULL,

  matched_rules text[] NULL,
  blockers text[] NULL,
  warnings text[] NULL,

  assigned_by text NULL,
  notes text NULL,

  CONSTRAINT valid_lead_assignment_type CHECK (
    assignment_type IN ('manual', 'best_match', 'reassignment')
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_events_lead_id
  ON public.lead_assignment_events (lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_events_partner_account_id
  ON public.lead_assignment_events (partner_account_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_events_assignment_type
  ON public.lead_assignment_events (assignment_type);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_events_created_at
  ON public.lead_assignment_events (created_at DESC);
