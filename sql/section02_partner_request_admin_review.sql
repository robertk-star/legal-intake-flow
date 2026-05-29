-- =============================================================================
-- Legal Intake Flow — Section 02: Partner Request Admin Review
-- Migration: Add internal_notes column to partner_access_requests
-- Database: Supabase / PostgreSQL
-- =============================================================================
-- Safe to run multiple times — uses IF NOT EXISTS / DO $$ blocks.
-- =============================================================================

-- ── Add internal_notes column (idempotent) ────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'partner_access_requests'
      AND column_name  = 'internal_notes'
  ) THEN
    ALTER TABLE public.partner_access_requests
      ADD COLUMN internal_notes text NULL;
  END IF;
END;
$$;

-- ── Confirm status constraint includes all required values ────────────────────
-- Drop and recreate the status check constraint to ensure all values are present.
-- This is idempotent — safe to re-run.

ALTER TABLE public.partner_access_requests
  DROP CONSTRAINT IF EXISTS partner_access_requests_status_check;

ALTER TABLE public.partner_access_requests
  ADD CONSTRAINT partner_access_requests_status_check
    CHECK (status IN ('new', 'reviewed', 'contacted', 'approved', 'declined'));

-- ── Ensure updated_at trigger exists ─────────────────────────────────────────
-- The set_updated_at() function and trigger were created in section01.
-- This block is a safety net in case section01 was not run first.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_partner_access_requests_updated_at
  ON public.partner_access_requests;

CREATE TRIGGER set_partner_access_requests_updated_at
  BEFORE UPDATE ON public.partner_access_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ── Add index on status (idempotent) ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_access_requests_status
  ON public.partner_access_requests (status);

-- =============================================================================
-- Migration complete.
-- =============================================================================
