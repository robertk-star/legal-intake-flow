-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 24 MIGRATION
-- Partner Team Management & User Invitations
-- =============================================================================

-- Adds lightweight invitation tracking to existing partner_users rows.
-- Safe to run after section06_partner_users.sql.

ALTER TABLE public.partner_users
  ADD COLUMN IF NOT EXISTS invite_email_sent_at timestamptz NULL;

ALTER TABLE public.partner_users
  ADD COLUMN IF NOT EXISTS invite_email_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.partner_users
  ADD COLUMN IF NOT EXISTS invited_by_partner_user_id uuid NULL
    REFERENCES public.partner_users(id)
    ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partner_users_invite_email_sent_at_idx
  ON public.partner_users (invite_email_sent_at DESC)
  WHERE invite_email_sent_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS partner_users_invited_by_idx
  ON public.partner_users (invited_by_partner_user_id)
  WHERE invited_by_partner_user_id IS NOT NULL;
