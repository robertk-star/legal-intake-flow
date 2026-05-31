-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 12 MIGRATION
-- Partner Routing Rules & Eligibility Preview Foundation
-- =============================================================================

-- Structured state list used for routing previews. This does not replace the
-- original states_served text field; it gives routing logic a clean array to use.
ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS routing_states text[] NULL;

-- Optional routing-specific admin/partner notes. Existing lead_notes remains the
-- partner-facing preference notes field; this can be used later for internal rules.
ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS routing_notes text NULL;

ALTER TABLE public.partner_accounts
  ADD COLUMN IF NOT EXISTS routing_updated_at timestamptz NULL;

-- Backfill routing_states from the original states_served text when possible.
-- Supports comma, semicolon, slash, pipe, and whitespace-separated state strings.
UPDATE public.partner_accounts
SET routing_states = (
  SELECT array_agg(DISTINCT upper(trim(token)))
  FROM unnest(regexp_split_to_array(coalesce(states_served, ''), '[,;/|[:space:]]+')) AS token
  WHERE trim(token) <> ''
),
routing_updated_at = coalesce(routing_updated_at, now())
WHERE routing_states IS NULL
  AND states_served IS NOT NULL
  AND trim(states_served) <> '';

-- Keep routing_updated_at current when partner preference/routing fields change.
CREATE OR REPLACE FUNCTION public.set_partner_routing_updated_at()
RETURNS trigger AS $$
BEGIN
  IF
    NEW.routing_states IS DISTINCT FROM OLD.routing_states OR
    NEW.accepting_leads IS DISTINCT FROM OLD.accepting_leads OR
    NEW.lead_status IS DISTINCT FROM OLD.lead_status OR
    NEW.accepted_case_types IS DISTINCT FROM OLD.accepted_case_types OR
    NEW.accepts_initial_filings IS DISTINCT FROM OLD.accepts_initial_filings OR
    NEW.accepts_appeals IS DISTINCT FROM OLD.accepts_appeals OR
    NEW.accepts_hearings IS DISTINCT FROM OLD.accepts_hearings OR
    NEW.accepts_child_cases IS DISTINCT FROM OLD.accepts_child_cases OR
    NEW.monthly_lead_capacity IS DISTINCT FROM OLD.monthly_lead_capacity OR
    NEW.routing_notes IS DISTINCT FROM OLD.routing_notes
  THEN
    NEW.routing_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_partner_accounts_routing_updated_at ON public.partner_accounts;
CREATE TRIGGER trg_partner_accounts_routing_updated_at
  BEFORE UPDATE ON public.partner_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_partner_routing_updated_at();

-- Helpful indexes for future routing and current eligibility previews.
CREATE INDEX IF NOT EXISTS idx_partner_accounts_routing_states
  ON public.partner_accounts USING gin (routing_states);

CREATE INDEX IF NOT EXISTS idx_partner_accounts_accepted_case_types
  ON public.partner_accounts USING gin (accepted_case_types);

CREATE INDEX IF NOT EXISTS idx_partner_accounts_routing_updated_at
  ON public.partner_accounts (routing_updated_at DESC)
  WHERE routing_updated_at IS NOT NULL;
