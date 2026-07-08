-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 52 MIGRATION
-- Lead Email Outreach
-- =============================================================================
-- Adds a durable admin-controlled outreach log for emails sent directly to leads.
-- This is separate from partner/client notification emails so claimant outreach
-- can be reviewed without mixing it into partner login, assignment, or invoice mail.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_outreach_email_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS lead_outreach_email_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_lead_outreach_email_sent_at
  ON public.leads (lead_outreach_email_sent_at DESC)
  WHERE lead_outreach_email_sent_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lead_outreach_emails (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  lead_id                uuid        NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  recipient_email        text        NOT NULL,
  recipient_name         text        NULL,
  sender_email           text        NOT NULL,
  sender_name            text        NULL,

  subject                text        NOT NULL,
  body_text              text        NOT NULL,
  body_html              text        NULL,

  status                 text        NOT NULL DEFAULT 'queued',
  provider               text        NOT NULL DEFAULT 'gmail_smtp',
  provider_message_id    text        NULL,
  sent_at                timestamptz NULL,
  error_message          text        NULL,

  sent_by                text        NOT NULL DEFAULT 'admin',
  metadata               jsonb       NULL
);

ALTER TABLE public.lead_outreach_emails
  DROP CONSTRAINT IF EXISTS lead_outreach_emails_status_check;

ALTER TABLE public.lead_outreach_emails
  ADD CONSTRAINT lead_outreach_emails_status_check
  CHECK (status IN ('queued', 'sent', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_lead_outreach_emails_created_at
  ON public.lead_outreach_emails (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_outreach_emails_status
  ON public.lead_outreach_emails (status);

CREATE INDEX IF NOT EXISTS idx_lead_outreach_emails_lead_id
  ON public.lead_outreach_emails (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lead_outreach_emails_recipient_email
  ON public.lead_outreach_emails (recipient_email);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lead_outreach_emails_updated_at ON public.lead_outreach_emails;
CREATE TRIGGER trg_lead_outreach_emails_updated_at
  BEFORE UPDATE ON public.lead_outreach_emails
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.lead_outreach_emails ENABLE ROW LEVEL SECURITY;

-- Service role is used by the admin API and bypasses RLS. No public policies required.

-- =============================================================================
-- Migration complete.
-- =============================================================================
