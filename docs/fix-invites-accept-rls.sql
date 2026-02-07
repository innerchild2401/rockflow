-- Run this in Supabase SQL Editor if accepting an invite fails with
-- "new row violates row-level security policy for table company_members".
-- Allows a user to insert themselves into company_members when they have a valid pending invite.

SET search_path = app, public;

-- True when the current user has a pending invite for this company.
-- Matches invite email to: JWT email, or profile email if JWT email is null (e.g. some OAuth).
CREATE OR REPLACE FUNCTION app.has_pending_invite_for_company(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.company_invites ci
    WHERE ci.company_id = p_company_id
      AND lower(trim(ci.email)) = lower(trim(coalesce(
        auth.jwt()->>'email',
        (SELECT email FROM app.profiles WHERE id = auth.uid())
      , '')))
      AND ci.accepted_at IS NULL
      AND ci.declined_at IS NULL
      AND ci.dismissed_at IS NULL
      AND ci.expires_at > now()
  );
$$;

-- Allow insert: admins, creator adding self, or invitee adding self when they have a pending invite
DROP POLICY IF EXISTS company_members_insert ON app.company_members;
CREATE POLICY company_members_insert ON app.company_members
  FOR INSERT WITH CHECK (
    app.can_manage_members(company_id)
    OR (user_id = app.current_user_id() AND app.is_company_creator(company_id))
    OR (user_id = app.current_user_id() AND app.has_pending_invite_for_company(company_id))
  );
