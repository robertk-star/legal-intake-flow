-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 26 MIGRATION
-- Partner Profile UX Cleanup & Change History
-- =============================================================================

-- This migration adds an audit trail for partner-maintained firm profile and
-- billing contact updates. It does not change billing, routing, or payment logic.

CREATE TABLE IF NOT EXISTS public.partner_account_profile_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),

  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  partner_user_id uuid NULL REFERENCES public.partner_users(id) ON DELETE SET NULL,

  event_type text NOT NULL DEFAULT 'profile_updated',
  changed_fields text[] NOT NULL DEFAULT '{}',
  previous_values jsonb NULL,
  new_values jsonb NULL,
  note text NULL
);

ALTER TABLE public.partner_account_profile_events
  DROP CONSTRAINT IF EXISTS valid_partner_profile_event_type;

ALTER TABLE public.partner_account_profile_events
  ADD CONSTRAINT valid_partner_profile_event_type
  CHECK (event_type IN ('profile_updated', 'billing_contact_updated'));

CREATE INDEX IF NOT EXISTS idx_partner_profile_events_account_created
  ON public.partner_account_profile_events (partner_account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_profile_events_user_created
  ON public.partner_account_profile_events (partner_user_id, created_at DESC)
  WHERE partner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_profile_events_type_created
  ON public.partner_account_profile_events (event_type, created_at DESC);
