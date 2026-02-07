-- Run this in Supabase Dashboard → SQL Editor (required for Invites inbox: Accept / Ignore / Refuse).
-- Add declined_at and dismissed_at to company_invites for inbox flow
-- declined_at = user explicitly refused; dismissed_at = user ignored (hide from list, link still valid)

SET search_path = app, public;

ALTER TABLE app.company_invites
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_company_invites_pending
  ON app.company_invites(email)
  WHERE accepted_at IS NULL AND declined_at IS NULL AND dismissed_at IS NULL;

-- Allow invitee to update their invite (e.g. set declined_at, dismissed_at)
CREATE POLICY company_invites_update_invitee ON app.company_invites
  FOR UPDATE
  USING (email = (SELECT email FROM app.profiles WHERE id = app.current_user_id()));
