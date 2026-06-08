-- Section 31: Partner Webhook / API Access
-- Safe to run multiple times.

ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS api_access_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS api_key_hash text,
  ADD COLUMN IF NOT EXISTS api_key_last_four text,
  ADD COLUMN IF NOT EXISTS api_key_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS api_key_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS webhook_url text,
  ADD COLUMN IF NOT EXISTS webhook_secret text,
  ADD COLUMN IF NOT EXISTS webhook_last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_status integer,
  ADD COLUMN IF NOT EXISTS webhook_last_error text;

CREATE INDEX IF NOT EXISTS idx_partner_accounts_api_key_hash
  ON public.partner_accounts (api_key_hash)
  WHERE api_key_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_accounts_webhook_enabled
  ON public.partner_accounts (webhook_enabled)
  WHERE webhook_enabled = true;
