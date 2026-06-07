-- ============================================================
-- Legal Intake Flow — Section 03: Partner Accounts
-- Safe to run multiple times (IF NOT EXISTS / DO $$ blocks)
-- ============================================================

-- ── 1. partner_accounts ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_accounts (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now(),

  -- Link back to the originating access request (nullable — accounts can exist independently)
  partner_request_id    uuid          NULL
    REFERENCES public.partner_access_requests(id)
    ON DELETE SET NULL,

  -- Core profile fields (copied from the access request at account creation time)
  firm_name             text          NOT NULL,
  contact_first_name    text          NOT NULL,
  contact_last_name     text          NOT NULL,
  email                 text          NOT NULL UNIQUE,
  phone                 text          NOT NULL,
  website               text          NULL,
  states_served         text          NOT NULL,
  practice_area         text          NOT NULL,
  monthly_lead_capacity text          NOT NULL,

  -- Account management
  status                text          NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),
  internal_notes        text          NULL,

  -- Auth tracking
  last_login_at         timestamptz   NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_accounts_email_idx
  ON public.partner_accounts (email);

CREATE INDEX IF NOT EXISTS partner_accounts_status_idx
  ON public.partner_accounts (status);

CREATE INDEX IF NOT EXISTS partner_accounts_created_at_idx
  ON public.partner_accounts (created_at DESC);

-- updated_at trigger (reuse existing function if already created by section01)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_partner_accounts'
  ) THEN
    CREATE TRIGGER set_updated_at_partner_accounts
      BEFORE UPDATE ON public.partner_accounts
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- RLS: enable but allow service role full access (service role bypasses RLS)
ALTER TABLE public.partner_accounts ENABLE ROW LEVEL SECURITY;

-- ── 2. partner_login_tokens ───────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_login_tokens (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  expires_at          timestamptz   NOT NULL,
  used_at             timestamptz   NULL,

  partner_account_id  uuid          NOT NULL
    REFERENCES public.partner_accounts(id)
    ON DELETE CASCADE,

  -- IMPORTANT: Only the SHA-256 hash of the raw token is stored.
  -- The raw token is generated once, shown to the admin, and never persisted.
  token_hash          text          NOT NULL UNIQUE
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_login_tokens_account_idx
  ON public.partner_login_tokens (partner_account_id);

CREATE INDEX IF NOT EXISTS partner_login_tokens_hash_idx
  ON public.partner_login_tokens (token_hash);

CREATE INDEX IF NOT EXISTS partner_login_tokens_expires_at_idx
  ON public.partner_login_tokens (expires_at);

-- RLS: enable but allow service role full access
ALTER TABLE public.partner_login_tokens ENABLE ROW LEVEL SECURITY;

-- ── Notes ─────────────────────────────────────────────────────
-- The set_updated_at() trigger function is expected to already exist
-- from section01_partner_access_requests.sql.
-- If running section03 on a fresh database, create it first:
--
-- CREATE OR REPLACE FUNCTION public.set_updated_at()
-- RETURNS TRIGGER LANGUAGE plpgsql AS $$
-- BEGIN
--   NEW.updated_at = now();
--   RETURN NEW;
-- END;
-- $$;
