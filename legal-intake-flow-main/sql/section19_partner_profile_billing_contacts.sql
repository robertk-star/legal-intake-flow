-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 25 MIGRATION
-- Partner Firm Profile + Billing Contact Settings
-- =============================================================================

-- Adds partner-editable firm profile metadata and billing contact fields.
-- This is safe to run after section18 and does not enable payment processing.

ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS profile_updated_at timestamptz NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS profile_updated_by_partner_user_id uuid NULL REFERENCES public.partner_users(id) ON DELETE SET NULL;

ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_contact_name text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_contact_email text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_contact_phone text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_address_line1 text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_address_line2 text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_city text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_state text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_zip text NULL;
ALTER TABLE public.partner_accounts ADD COLUMN IF NOT EXISTS billing_notes text NULL;

-- Backfill billing contact with the current primary contact where blank.
UPDATE public.partner_accounts
SET billing_contact_name = trim(concat_ws(' ', contact_first_name, contact_last_name))
WHERE billing_contact_name IS NULL
  AND (contact_first_name IS NOT NULL OR contact_last_name IS NOT NULL);

UPDATE public.partner_accounts
SET billing_contact_email = email
WHERE billing_contact_email IS NULL
  AND email IS NOT NULL;

UPDATE public.partner_accounts
SET billing_contact_phone = phone
WHERE billing_contact_phone IS NULL
  AND phone IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_accounts_billing_contact_email
  ON public.partner_accounts (billing_contact_email)
  WHERE billing_contact_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_partner_accounts_profile_updated_at
  ON public.partner_accounts (profile_updated_at DESC)
  WHERE profile_updated_at IS NOT NULL;
