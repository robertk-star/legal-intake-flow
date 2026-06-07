-- ============================================================
-- Legal Intake Flow — Section 05: Partner Login Requests
-- ============================================================
-- Run this migration in Supabase SQL Editor (or via psql).
-- Safe to re-run: uses IF NOT EXISTS throughout.
-- ============================================================

-- ── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_login_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at         timestamptz NOT NULL    DEFAULT now(),
  email              text        NOT NULL,
  partner_account_id uuid        NULL        REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  status             text        NOT NULL    DEFAULT 'new',
  ip_address         text        NULL,
  user_agent         text        NULL
);

-- ── Status constraint ────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name   = 'partner_login_requests'
      AND constraint_name = 'partner_login_requests_status_check'
  ) THEN
    ALTER TABLE public.partner_login_requests
      ADD CONSTRAINT partner_login_requests_status_check
      CHECK (status IN ('new', 'completed', 'dismissed'));
  END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_partner_login_requests_email
  ON public.partner_login_requests (email);

CREATE INDEX IF NOT EXISTS idx_partner_login_requests_status
  ON public.partner_login_requests (status);

CREATE INDEX IF NOT EXISTS idx_partner_login_requests_created_at
  ON public.partner_login_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_login_requests_partner_account_id
  ON public.partner_login_requests (partner_account_id)
  WHERE partner_account_id IS NOT NULL;

-- ── Row Level Security ───────────────────────────────────────────────────────

ALTER TABLE public.partner_login_requests ENABLE ROW LEVEL SECURITY;

-- Service role (used by the API) bypasses RLS by default.
-- No public policies needed — all access is via service role key.

-- ============================================================
-- Migration complete.
-- ============================================================
