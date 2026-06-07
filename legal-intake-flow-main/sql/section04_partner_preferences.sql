-- ============================================================
-- Legal Intake Flow — Section 04: Partner Intake Preferences
-- Adds lead preference columns to public.partner_accounts
-- Safe to run multiple times (ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ── Add preference columns ────────────────────────────────────

ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS accepting_leads          boolean   NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepted_case_types      text[]    NULL,
  ADD COLUMN IF NOT EXISTS accepted_languages       text[]    NULL,
  ADD COLUMN IF NOT EXISTS accepts_initial_filings  boolean   NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS accepts_appeals          boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_hearings         boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS accepts_child_cases      boolean   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lead_notes               text      NULL,
  ADD COLUMN IF NOT EXISTS lead_status              text      NOT NULL DEFAULT 'active';

-- ── Add lead_status constraint (safe — skips if already exists) ───────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'partner_accounts_lead_status_check'
  ) THEN
    ALTER TABLE public.partner_accounts
      ADD CONSTRAINT partner_accounts_lead_status_check
      CHECK (lead_status IN ('active', 'paused', 'at_capacity'));
  END IF;
END;
$$;

-- ── Indexes ───────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS partner_accounts_accepting_leads_idx
  ON public.partner_accounts (accepting_leads);

CREATE INDEX IF NOT EXISTS partner_accounts_lead_status_idx
  ON public.partner_accounts (lead_status);

-- ── Notes ─────────────────────────────────────────────────────
-- accepted_case_types stores benefit program tags only.
-- Case stage preferences are stored in the boolean columns.
-- accepted_case_types and accepted_languages are stored as
-- Postgres text[] arrays. Example values:
--   accepted_case_types: {'SSDI', 'SSI'}
--   accepted_languages:  {'English', 'Spanish'}
--
-- monthly_lead_capacity already exists on partner_accounts from
-- section03 and is not modified here.
--
-- No lead routing, no billing, no email integration.
-- ============================================================
