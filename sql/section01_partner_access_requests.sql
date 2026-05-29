-- =============================================================================
-- Legal Intake Flow — Section 01: Partner Access Requests
-- Migration: Create partner_access_requests table
-- Database: Supabase / PostgreSQL
-- =============================================================================
-- Run this migration once against your Supabase project.
-- Safe to run multiple times — uses CREATE TABLE IF NOT EXISTS.
-- =============================================================================

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_access_requests (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),

  -- Contact
  first_name            text          NOT NULL,
  last_name             text          NOT NULL,
  firm_name             text          NOT NULL,
  email                 text          NOT NULL,
  phone                 text          NOT NULL,
  website               text          NULL,

  -- Practice
  states_served         text          NOT NULL,
  practice_area         text          NOT NULL,
  monthly_lead_capacity text          NOT NULL,

  -- Notes
  message               text          NULL,

  -- Workflow
  status                text          NOT NULL DEFAULT 'new',
  source                text          NOT NULL DEFAULT 'legalintakeflow.com',

  -- Status constraint
  CONSTRAINT partner_access_requests_status_check
    CHECK (status IN ('new', 'reviewed', 'approved', 'declined', 'contacted'))
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_access_requests_created_at
  ON public.partner_access_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_access_requests_email
  ON public.partner_access_requests (email);

CREATE INDEX IF NOT EXISTS idx_partner_access_requests_status
  ON public.partner_access_requests (status);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Automatically updates the updated_at column on every row update.

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

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Enable RLS. The API route uses the service role key which bypasses RLS,
-- so no INSERT policy is needed for the public API.
-- Add SELECT/UPDATE policies as needed for admin access.

ALTER TABLE public.partner_access_requests ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Migration complete.
-- =============================================================================
