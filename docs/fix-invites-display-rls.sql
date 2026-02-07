-- Run this in Supabase SQL Editor so the Invites inbox shows company name and inviter name
-- instead of "Unknown" and "Someone". Lets invitees read companies they're invited to and
-- the inviter's profile (display_name/email) for display.

SET search_path = app, public;

-- True when the current user has a pending invite for this company.
-- Matches invite email to JWT email, or profile email if JWT email is null (e.g. some OAuth).
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

-- True when this profile is the inviter (invited_by) of a pending invite to the current user's email.
-- Uses auth JWT email so it works even if profiles.email is null or out of sync.
CREATE OR REPLACE FUNCTION app.is_inviter_for_current_user(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.company_invites ci
    WHERE ci.invited_by = p_profile_id
      AND lower(trim(ci.email)) = lower(trim(coalesce(auth.jwt()->>'email', '')))
      AND ci.accepted_at IS NULL
      AND ci.declined_at IS NULL
      AND ci.dismissed_at IS NULL
      AND ci.expires_at > now()
  );
$$;

-- Companies: allow invitees to read companies they have a pending invite to (so name/slug show in inbox)
CREATE POLICY companies_select_invited ON app.companies
  FOR SELECT USING (app.has_pending_invite_for_company(id));

-- Profiles: allow invitees to read inviter's profile (display_name/email) for "Invited by X"
CREATE POLICY profiles_select_inviter ON app.profiles
  FOR SELECT USING (app.is_inviter_for_current_user(id));
