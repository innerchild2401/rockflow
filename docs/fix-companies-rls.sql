-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy"
-- when creating a company or when accepting an invite. It (1) relaxes companies INSERT,
-- (2) allows the company creator to add themselves as first member, and (3) allows
-- invitees to add themselves when accepting an invite.

SET search_path = app, public;

-- Helper: true when current user created the company
CREATE OR REPLACE FUNCTION app.is_company_creator(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT created_by = app.current_user_id() FROM app.companies WHERE id = p_company_id;
$$;

-- Helper: true when current user has a pending invite for this company (for accept-invite).
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

-- Companies: allow any authenticated user to create (app sets created_by)
DROP POLICY IF EXISTS companies_insert_admin ON app.companies;
CREATE POLICY companies_insert_admin ON app.companies
  FOR INSERT WITH CHECK (app.current_user_id() IS NOT NULL);

-- Company members: creator adding self, admins adding members, or invitee adding self when accepting
DROP POLICY IF EXISTS company_members_insert ON app.company_members;
CREATE POLICY company_members_insert ON app.company_members
  FOR INSERT WITH CHECK (
    app.can_manage_members(company_id)
    OR (user_id = app.current_user_id() AND app.is_company_creator(company_id))
    OR (user_id = app.current_user_id() AND app.has_pending_invite_for_company(company_id))
  );
