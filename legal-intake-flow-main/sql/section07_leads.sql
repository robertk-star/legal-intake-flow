-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 9 MIGRATION
-- Public Claimant Intake + Lead Queue Foundation
-- =============================================================================

-- Create the lead status enum type if it doesn't exist
-- Allowed: 'new', 'reviewing', 'ready_to_match', 'matched', 'closed', 'spam'
DO $$ BEGIN
    CREATE TYPE public.lead_status_type AS ENUM (
        'new',
        'reviewing',
        'ready_to_match',
        'matched',
        'closed',
        'spam'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create public.leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    -- Contact Information
    first_name text NOT NULL,
    last_name text NOT NULL,
    phone text NOT NULL,
    email text NULL,
    city text NULL,
    state text NOT NULL,
    zip text NULL,

    -- Preferences & Context
    preferred_contact_method text NULL, -- 'phone', 'email', 'text'
    lives_in_us boolean NULL,
    age_range text NULL,                -- 'under 18', '18–34', '35–49', '50–64', '65+'
    benefit_type text NULL,             -- 'SSDI', 'SSI', 'Both', 'Not Sure'
    application_status text NULL,       -- 'Have not applied yet', 'Application pending', 'Denied', etc.

    -- Medical & Text Fields
    medical_summary text NULL,
    has_attorney text NULL,             -- 'yes', 'no', 'not sure'
    additional_notes text NULL,

    -- Legal Consent
    consent_given boolean NOT NULL DEFAULT false,

    -- Lead Queue & Status
    status text NOT NULL DEFAULT 'new', -- Default is 'new', constraint enforces valid statuses

    -- Manual Assignment
    assigned_partner_account_id uuid NULL REFERENCES public.partner_accounts(id) ON DELETE SET NULL,

    -- Internal Review Notes
    review_notes text NULL,
    reviewed_at timestamptz NULL,

    -- Constraint to enforce valid status values
    CONSTRAINT valid_lead_status CHECK (status IN ('new', 'reviewing', 'ready_to_match', 'matched', 'closed', 'spam'))
);

-- Enable RLS (Row Level Security) on public.leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (anyone can apply)
CREATE POLICY "Allow public inserts on leads" 
    ON public.leads 
    FOR INSERT 
    WITH CHECK (true);

-- Create policy to allow authenticated admins full access
-- Since admin auth in this Next.js app is handled via custom session cookie + service role client,
-- we'll rely on the service role key bypassing RLS, but we add a safety policy here just in case.
CREATE POLICY "Allow admin full access on leads" 
    ON public.leads 
    FOR ALL 
    TO authenticated 
    USING (true) 
    WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_state ON public.leads (state);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_partner ON public.leads (assigned_partner_account_id) WHERE assigned_partner_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads (email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone ON public.leads (phone);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
