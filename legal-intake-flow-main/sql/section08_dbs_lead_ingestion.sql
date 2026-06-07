-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 10 (PHASE 6 ALIGNMENT) MIGRATION
-- DBS Lead Intake Pipeline into LIF
-- =============================================================================

-- Ensure public.leads exists with proper fields.
-- We alter/add columns in an idempotent manner to make this safe to run on top of Phase 9.

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- 1. Idempotently add/alter columns to support DBS ingestion spec
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'disabilitybenefitsscreening';
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS external_reference_id text NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS first_name text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS last_name text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS phone text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email text NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS city text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS state text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS zip text NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS benefit_type text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS application_status text NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS medical_summary text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS additional_notes text NULL;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Ensure foreign key for manual assignment exists
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_partner_account_id uuid NULL;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'leads' AND constraint_name = 'leads_assigned_partner_account_id_fkey'
    ) THEN
        ALTER TABLE public.leads 
        ADD CONSTRAINT leads_assigned_partner_account_id_fkey 
        FOREIGN KEY (assigned_partner_account_id) REFERENCES public.partner_accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS assigned_at timestamptz NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS partner_response_status text NULL;

-- Internal review notes and raw JSON payload
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS internal_review_notes text NULL;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS raw_payload jsonb NULL;

-- 2. Make sure any legacy columns that were NOT NULL are made NULLable
-- In Phase 9, first_name, last_name, phone, and state were NOT NULL.
-- DBS ingestion spec requires them to be tolerant of missing fields (NULLable).
ALTER TABLE public.leads ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN last_name DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN phone DROP NOT NULL;
ALTER TABLE public.leads ALTER COLUMN state DROP NOT NULL;

-- 3. Migrate existing Phase 9 status values to Phase 10 equivalents.
-- Must happen BEFORE the new constraint is added, or existing rows will violate it.
UPDATE public.leads SET status = 'ready_to_assign' WHERE status = 'ready_to_match';
UPDATE public.leads SET status = 'assigned'        WHERE status = 'matched';

-- 4. Backfill internal_review_notes from review_notes if that column exists.
-- Wrapped in a DO block so it is safe even if review_notes was never created.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'leads'
          AND column_name  = 'review_notes'
    ) THEN
        UPDATE public.leads
        SET internal_review_notes = review_notes
        WHERE internal_review_notes IS NULL
          AND review_notes IS NOT NULL;
    END IF;
END $$;

-- 5. Update the lead status constraint.
-- Allowed status values in Phase 10: new, reviewing, ready_to_assign, assigned, closed, rejected, spam
-- Drop the old constraint first (handles both Phase 9 and fresh installs).
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS valid_lead_status;
ALTER TABLE public.leads ADD CONSTRAINT valid_lead_status 
    CHECK (status IN ('new', 'reviewing', 'ready_to_assign', 'assigned', 'closed', 'rejected', 'spam'));

-- 6. Enable Row Level Security (RLS) on public.leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- 7. Drop the public insert policy.
-- In Phase 10, all ingestion is done via POST /api/intake/ingest (service role client, bypasses RLS).
-- No unauthenticated public inserts are allowed.
DROP POLICY IF EXISTS "Allow public inserts on leads" ON public.leads;

-- 8. Re-create the authenticated admin full-access policy
DROP POLICY IF EXISTS "Allow admin full access on leads" ON public.leads;
CREATE POLICY "Allow admin full access on leads" 
    ON public.leads 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- 9. Indexes
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads (state) WHERE state IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_assigned_partner_account_id ON public.leads (assigned_partner_account_id) WHERE assigned_partner_account_id IS NOT NULL;

-- Unique partial index for duplicate protection.
-- Enforces that (source, external_reference_id) is unique when external_reference_id IS NOT NULL.
-- This prevents DBS from accidentally creating duplicate lead records for the same external ID.
DROP INDEX IF EXISTS idx_leads_source_external_ref_unique;
CREATE UNIQUE INDEX idx_leads_source_external_ref_unique
    ON public.leads (source, external_reference_id)
    WHERE external_reference_id IS NOT NULL;

-- 10. Add updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_set_leads_updated_at'
    ) THEN
        CREATE TRIGGER trigger_set_leads_updated_at
            BEFORE UPDATE ON public.leads
            FOR EACH ROW
            EXECUTE FUNCTION public.set_updated_at();
    END IF;
END $$;
