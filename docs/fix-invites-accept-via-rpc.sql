-- Run this in Supabase SQL Editor if accept-invite still fails with RLS on company_members.
-- Adds an RPC that runs as SECURITY DEFINER so the insert bypasses RLS. The app will call
-- this RPC instead of inserting into company_members directly.

SET search_path = app, public;

-- RPC: add current user to company_members for an invite they are accepting.
-- Caller must pass invite_id; we verify invite is for auth.uid() (email match) then insert.
CREATE OR REPLACE FUNCTION app.accept_invite_add_member(p_invite_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app
AS $func$
DECLARE
  v_company_id UUID;
  v_user_id UUID := auth.uid();
  v_email_norm TEXT;
  v_slug TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Not authenticated.');
  END IF;

  v_email_norm := lower(trim(coalesce(auth.jwt()->>'email', (SELECT email FROM app.profiles WHERE id = v_user_id))));

  SELECT company_id INTO v_company_id
  FROM app.company_invites
  WHERE id = p_invite_id
    AND accepted_at IS NULL
    AND declined_at IS NULL
    AND dismissed_at IS NULL
    AND expires_at > now()
    AND lower(trim(email)) = coalesce(v_email_norm, '');

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Invalid or expired invite.');
  END IF;

  INSERT INTO app.company_members (company_id, user_id, role, invited_at, joined_at)
  VALUES (v_company_id, v_user_id, 'member', now(), now())
  ON CONFLICT (company_id, user_id) DO UPDATE
  SET invited_at = now(), joined_at = now();

  UPDATE app.company_invites SET accepted_at = now() WHERE id = p_invite_id;

  SELECT slug INTO v_slug FROM app.companies WHERE id = v_company_id;

  RETURN jsonb_build_object('ok', true, 'slug', v_slug);
END;
$func$;