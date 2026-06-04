-- =============================================================================
-- LEGAL INTAKE FLOW — PARTNER STATE COVERAGE CLEANUP
-- Social Security Disability-only routing preferences
-- =============================================================================

ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS routing_scope text NOT NULL DEFAULT 'selected_states',
  ADD COLUMN IF NOT EXISTS routing_excluded_states text[] NULL;

ALTER TABLE public.partner_accounts DROP CONSTRAINT IF EXISTS valid_partner_routing_scope;
ALTER TABLE public.partner_accounts ADD CONSTRAINT valid_partner_routing_scope
  CHECK (routing_scope IN ('united_states', 'selected_states'));

-- Existing partners keep selected-state routing unless explicitly changed.
UPDATE public.partner_accounts
SET routing_scope = 'selected_states'
WHERE routing_scope IS NULL;

-- The platform now supports Social Security Disability only. Keep legacy columns
-- populated with stable values so older routing/reporting code remains safe.
UPDATE public.partner_accounts
SET accepted_case_types = ARRAY['SSDI','SSI']::text[]
WHERE accepted_case_types IS NULL OR accepted_case_types = '{}'::text[];

UPDATE public.partner_accounts
SET accepted_languages = ARRAY['English']::text[]
WHERE accepted_languages IS NULL OR accepted_languages = '{}'::text[];

CREATE INDEX IF NOT EXISTS idx_partner_accounts_routing_scope
  ON public.partner_accounts (routing_scope);

CREATE INDEX IF NOT EXISTS idx_partner_accounts_routing_excluded_states
  ON public.partner_accounts USING GIN (routing_excluded_states);

-- =============================================================================
-- Migration complete.
-- =============================================================================
