-- ============================================================
-- Legal Intake Flow — Section 06: Partner Users
-- Safe to run multiple times (IF NOT EXISTS / DO $$ blocks)
-- ============================================================

-- ── 1. partner_users ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.partner_users (
  id                  uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at          timestamptz   NOT NULL DEFAULT now(),
  updated_at          timestamptz   NOT NULL DEFAULT now(),

  partner_account_id  uuid          NOT NULL
    REFERENCES public.partner_accounts(id)
    ON DELETE CASCADE,

  email               text          NOT NULL,
  first_name          text          NOT NULL,
  last_name           text          NOT NULL,
  role                text          NOT NULL DEFAULT 'staff'
    CHECK (role IN ('owner', 'admin', 'staff', 'viewer')),

  status              text          NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive', 'pending', 'suspended')),

  last_login_at       timestamptz   NULL,
  invited_at          timestamptz   NULL,
  accepted_at         timestamptz   NULL,

  -- Unique email per partner account
  CONSTRAINT partner_users_account_email_key UNIQUE (partner_account_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS partner_users_account_idx
  ON public.partner_users (partner_account_id);

CREATE INDEX IF NOT EXISTS partner_users_email_idx
  ON public.partner_users (email);

CREATE INDEX IF NOT EXISTS partner_users_role_idx
  ON public.partner_users (role);

CREATE INDEX IF NOT EXISTS partner_users_status_idx
  ON public.partner_users (status);

CREATE INDEX IF NOT EXISTS partner_users_created_at_idx
  ON public.partner_users (created_at DESC);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_updated_at_partner_users'
  ) THEN
    CREATE TRIGGER set_updated_at_partner_users
      BEFORE UPDATE ON public.partner_users
      FOR EACH ROW
      EXECUTE FUNCTION public.set_updated_at();
  END IF;
END;
$$;

-- RLS: enable but allow service role full access
ALTER TABLE public.partner_users ENABLE ROW LEVEL SECURITY;

-- ── 2. Backfill Existing Partner Accounts ────────────────────
-- Create an initial owner user for each existing partner account using its primary contact fields.
-- Safe and idempotent (checks if user with that email already exists for that account).

DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, email, contact_first_name, contact_last_name, created_at
    FROM public.partner_accounts
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.partner_users
      WHERE partner_account_id = rec.id AND email = LOWER(TRIM(rec.email))
    ) THEN
      INSERT INTO public.partner_users (
        partner_account_id,
        email,
        first_name,
        last_name,
        role,
        status,
        created_at,
        invited_at,
        accepted_at
      ) VALUES (
        rec.id,
        LOWER(TRIM(rec.email)),
        rec.contact_first_name,
        rec.contact_last_name,
        'owner',
        'active',
        rec.created_at,
        rec.created_at,
        rec.created_at
      );
    END IF;
  END LOOP;
END;
$$;

-- ── 3. Extend partner_login_tokens ───────────────────────────

ALTER TABLE public.partner_login_tokens
  ADD COLUMN IF NOT EXISTS partner_user_id uuid NULL
  REFERENCES public.partner_users(id)
  ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS partner_login_tokens_user_idx
  ON public.partner_login_tokens (partner_user_id);

-- ── 4. Extend partner_login_requests ─────────────────────────

ALTER TABLE public.partner_login_requests
  ADD COLUMN IF NOT EXISTS partner_user_id uuid NULL
  REFERENCES public.partner_users(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS partner_login_requests_user_idx
  ON public.partner_login_requests (partner_user_id);
