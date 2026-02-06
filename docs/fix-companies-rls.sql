-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy"
-- when creating a company. It (1) relaxes companies INSERT so any authenticated user can create,
-- and (2) allows the company creator to add themselves as the first member.

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

-- Companies: allow any authenticated user to create (app sets created_by)
DROP POLICY IF EXISTS companies_insert_admin ON app.companies;
CREATE POLICY companies_insert_admin ON app.companies
  FOR INSERT WITH CHECK (app.current_user_id() IS NOT NULL);

-- Company members: allow creator to add themselves as first member
DROP POLICY IF EXISTS company_members_insert ON app.company_members;
CREATE POLICY company_members_insert ON app.company_members
  FOR INSERT WITH CHECK (
    app.can_manage_members(company_id)
    OR (user_id = app.current_user_id() AND app.is_company_creator(company_id))
  );
