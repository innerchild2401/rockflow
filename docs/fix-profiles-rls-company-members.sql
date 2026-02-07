-- Run this in Supabase SQL Editor so feed and task chat show author names instead of "Unknown".
-- Allows reading profiles of other users who are in the same company as the current user.

SET search_path = app, public;

-- True when this profile belongs to a user who shares at least one company with the current user
CREATE OR REPLACE FUNCTION app.is_same_company_member(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = app
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app.company_members m1
    JOIN app.company_members m2 ON m2.company_id = m1.company_id AND m2.user_id = app.current_user_id()
    WHERE m1.user_id = p_profile_id
  );
$$;

-- Profiles: allow reading profiles of other members of the same company (for feed/chat author names)
CREATE POLICY profiles_select_company_member ON app.profiles
  FOR SELECT USING (app.is_same_company_member(id));
