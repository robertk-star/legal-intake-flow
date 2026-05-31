-- =============================================================================
-- LEGAL INTAKE FLOW — PHASE 14 MIGRATION
-- Email Notifications & Delivery Log
-- =============================================================================
-- Adds a durable email notification log used by login-link emails and lead
-- assignment notifications. Safe to run after section11.


-- Lead-level summary fields for admin UI display and resend tracking.
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS assignment_notification_sent_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS assignment_notification_count integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_leads_assignment_notification_sent_at
  ON public.leads (assignment_notification_sent_at DESC)
  WHERE assignment_notification_sent_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.email_notifications (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now(),

  notification_type      text        NOT NULL,
  recipient_email        text        NOT NULL,
  recipient_name         text        NULL,
  subject                text        NOT NULL,

  status                 text        NOT NULL DEFAULT 'queued',
  provider               text        NULL DEFAULT 'resend',
  provider_message_id    text        NULL,
  error_message          text        NULL,
  sent_at                timestamptz NULL,

  lead_id                uuid        NULL REFERENCES public.leads(id) ON DELETE SET NULL,
  partner_account_id     uuid        NULL REFERENCES public.partner_accounts(id) ON DELETE SET NULL,
  partner_user_id        uuid        NULL REFERENCES public.partner_users(id) ON DELETE SET NULL,
  login_request_id       uuid        NULL REFERENCES public.partner_login_requests(id) ON DELETE SET NULL,

  metadata               jsonb       NULL
);

ALTER TABLE public.email_notifications
  DROP CONSTRAINT IF EXISTS email_notifications_status_check;

ALTER TABLE public.email_notifications
  ADD CONSTRAINT email_notifications_status_check
  CHECK (status IN ('queued', 'sent', 'failed', 'skipped'));

CREATE INDEX IF NOT EXISTS idx_email_notifications_created_at
  ON public.email_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_notifications_status
  ON public.email_notifications (status);

CREATE INDEX IF NOT EXISTS idx_email_notifications_type
  ON public.email_notifications (notification_type);

CREATE INDEX IF NOT EXISTS idx_email_notifications_lead_id
  ON public.email_notifications (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_partner_account_id
  ON public.email_notifications (partner_account_id)
  WHERE partner_account_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_partner_user_id
  ON public.email_notifications (partner_user_id)
  WHERE partner_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_notifications_login_request_id
  ON public.email_notifications (login_request_id)
  WHERE login_request_id IS NOT NULL;

-- updated_at trigger. Reuses set_updated_at() if prior migrations created it.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_email_notifications_updated_at ON public.email_notifications;
CREATE TRIGGER trg_email_notifications_updated_at
  BEFORE UPDATE ON public.email_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.email_notifications ENABLE ROW LEVEL SECURITY;

-- Service role is used by the API and bypasses RLS. No public policies required.

-- =============================================================================
-- Migration complete.
-- =============================================================================
