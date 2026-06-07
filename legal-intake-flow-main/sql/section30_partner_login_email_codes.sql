-- =============================================================================
-- LEGAL INTAKE FLOW — PARTNER LOGIN EMAIL CODES
-- =============================================================================
-- Adds short-lived partner login codes for partner/client login.
-- This does not remove existing one-time magic links used by admin invites.

CREATE TABLE IF NOT EXISTS public.partner_login_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz NULL,

  partner_account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE,
  partner_user_id uuid NOT NULL REFERENCES public.partner_users(id) ON DELETE CASCADE,
  login_request_id uuid NULL REFERENCES public.partner_login_requests(id) ON DELETE SET NULL,

  email text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  ip_address text NULL,
  user_agent text NULL
);

CREATE INDEX IF NOT EXISTS idx_partner_login_codes_user
  ON public.partner_login_codes (partner_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_partner_login_codes_hash
  ON public.partner_login_codes (code_hash);

CREATE INDEX IF NOT EXISTS idx_partner_login_codes_expires
  ON public.partner_login_codes (expires_at)
  WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_partner_login_codes_email
  ON public.partner_login_codes (email, created_at DESC);

-- =============================================================================
-- Migration complete.
-- =============================================================================
