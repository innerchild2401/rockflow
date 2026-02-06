-- Fix: "permission denied for table users" on company_invites
-- The SELECT policy used auth.users; anon/authenticated cannot read auth.users.
-- Use app.profiles (same email) instead.

SET search_path = app;

DROP POLICY IF EXISTS company_invites_select ON app.company_invites;

CREATE POLICY company_invites_select ON app.company_invites
  FOR SELECT USING (
    app.is_company_member(company_id)
    OR email = (SELECT email FROM app.profiles WHERE id = app.current_user_id())
  );
