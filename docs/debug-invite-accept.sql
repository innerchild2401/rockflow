-- =============================================================================
-- DEBUG: "new row violates RLS on company_members" when accepting invite
-- =============================================================================
-- Run in Supabase SQL Editor.
--
-- STEP 1: Replace the 3 placeholders in the vars CTE below:
--   - invitee_email: the email the invite was sent to (same as the user's login)
--   - invitee_user_id: Auth → Users → click the user → copy "User UID"
--   - invite_id: (optional) company_invites.id; use NULL to see all pending
--
-- STEP 2: Run the whole script. One result set: section, what we see, and note.
-- =============================================================================

WITH vars AS (
  SELECT
    'PASTE_INVITEE_EMAIL_HERE'::text AS invitee_email,   -- e.g. 'jane@example.com'
    '00000000-0000-0000-0000-000000000000'::uuid AS invitee_user_id,   -- replace with real User UID from Auth → Users
    NULL::uuid AS invite_id   -- or 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::uuid to focus on one invite
),

pending AS (
  SELECT ci.id AS invite_id, ci.company_id, ci.email AS invite_email,
         ci.invited_by, ci.expires_at,
         lower(trim(ci.email)) AS invite_email_norm
  FROM app.company_invites ci
  CROSS JOIN vars v
  WHERE ci.accepted_at IS NULL
    AND ci.declined_at IS NULL
    AND ci.dismissed_at IS NULL
    AND ci.expires_at > now()
    AND (v.invite_id IS NULL OR ci.id = v.invite_id)
),

policy_check AS (
  SELECT p.invite_id, p.company_id,
         (lower(trim(v.invitee_email)) = p.invite_email_norm) AS email_matches
  FROM pending p
  CROSS JOIN vars v
)

SELECT '1_pending_invite' AS section,
       p.invite_id::text AS id,
       p.company_id::text,
       c.name AS company_name,
       p.invite_email,
       prof.display_name AS inviter_name,
       pc.email_matches,
       'expires ' || p.expires_at::text AS note
FROM pending p
JOIN app.companies c ON c.id = p.company_id
LEFT JOIN app.profiles prof ON prof.id = p.invited_by
JOIN policy_check pc ON pc.invite_id = p.invite_id AND pc.company_id = p.company_id

UNION ALL

SELECT '2_invitee_profile',
       p.id::text, NULL::text, NULL::text, p.email,
       p.display_name,
       (p.email IS NOT NULL AND lower(trim(p.email)) = (SELECT lower(trim(invitee_email)) FROM vars)),
       CASE WHEN p.email IS NULL THEN 'PROFILE EMAIL IS NULL' ELSE 'profile email set' END
FROM app.profiles p
CROSS JOIN vars v
WHERE p.id = v.invitee_user_id

UNION ALL

SELECT '3_policy_would_allow',
       p.invite_id::text, p.company_id::text, c.name, p.invite_email,
       NULL,
       pc.email_matches,
       CASE WHEN pc.email_matches THEN 'OK if JWT email = invitee_email' ELSE 'FAIL: email mismatch' END
FROM pending p
JOIN app.companies c ON c.id = p.company_id
JOIN policy_check pc ON pc.invite_id = p.invite_id AND pc.company_id = p.company_id

UNION ALL

SELECT '4_existing_memberships',
       cm.id::text, cm.company_id::text, c.name, NULL, NULL, NULL,
       'role=' || cm.role::text
FROM app.company_members cm
JOIN app.companies c ON c.id = cm.company_id
CROSS JOIN vars v
WHERE cm.user_id = v.invitee_user_id

ORDER BY section, company_name;