-- identity-038: separate authentication surface authority from business permissions.
--
-- Root:
--   Historical local/public actor provisioning manufactured app-client/app-partner
--   store:read/store:write permissions only so session surface access could be
--   inferred from business Permission rows. Identity now derives mobile surface
--   authority from the actor role + exact session surface; Permission vocabulary
--   remains business authorization only.
--
-- Cutover:
--   1. Remove the obsolete generic mobile DSH permissions from durable actors.
--   2. Revoke legacy self-issued Partner OTP challenges created by the retired
--      public Partner OTP path.
--   3. Revoke active mobile sessions whose durable session surface is not owned
--      by the actor's role.
--   4. Fail if any material residue remains.

-- The JSON columns on identity_actors are a derived projection. First
-- regenerate them from normalized authority so this migration never becomes
-- a second writer for role/permission truth.
DO $$
DECLARE
    actor_id text;
BEGIN
    FOR actor_id IN SELECT id FROM identity_actors LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_id);
    END LOOP;
END
$$;

CREATE TEMP TABLE identity_038_obsolete_permission_ids ON COMMIT DROP AS
SELECT id
FROM identity_permission_vocabulary
WHERE service = 'dsh'
  AND surface IN ('app-client', 'app-partner')
  AND action IN ('store:read', 'store:write');

-- Remove obsolete authority at its normalized owner. The existing projection
-- triggers rebuild identity_actors after each normalized mutation.
DELETE FROM identity_role_permissions role_permission
USING identity_038_obsolete_permission_ids obsolete
WHERE role_permission.permission_id = obsolete.id;

DELETE FROM identity_actor_direct_permissions direct_permission
USING identity_038_obsolete_permission_ids obsolete
WHERE direct_permission.permission_id = obsolete.id;

DELETE FROM identity_permission_vocabulary vocabulary
USING identity_038_obsolete_permission_ids obsolete
WHERE vocabulary.id = obsolete.id
  AND NOT EXISTS (
      SELECT 1 FROM identity_role_permissions role_permission
      WHERE role_permission.permission_id = vocabulary.id
  )
  AND NOT EXISTS (
      SELECT 1 FROM identity_actor_direct_permissions direct_permission
      WHERE direct_permission.permission_id = vocabulary.id
  );

UPDATE identity_activation_challenges
SET status = 'revoked',
    updated_at = now()
WHERE actor_type = 'partner'
  AND status = 'pending'
  AND actor_id IS NOT NULL
  AND issued_by_actor_id = actor_id;

UPDATE identity_sessions AS session
SET revoked_at = COALESCE(session.revoked_at, now())
FROM identity_actors AS actor
WHERE actor.id = session.actor_id
  AND session.revoked_at IS NULL
  AND (
      (session.surface = 'app-client'  AND NOT EXISTS (
          SELECT 1 FROM identity_actor_roles assignment
          JOIN identity_roles role ON role.id = assignment.role_id
          WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'client'
      ))
   OR (session.surface = 'app-partner' AND NOT EXISTS (
          SELECT 1 FROM identity_actor_roles assignment
          JOIN identity_roles role ON role.id = assignment.role_id
          WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'partner'
      ))
   OR (session.surface = 'app-field'   AND NOT EXISTS (
          SELECT 1 FROM identity_actor_roles assignment
          JOIN identity_roles role ON role.id = assignment.role_id
          WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'field'
      ))
   OR (session.surface = 'app-captain' AND NOT EXISTS (
          SELECT 1 FROM identity_actor_roles assignment
          JOIN identity_roles role ON role.id = assignment.role_id
          WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'captain'
      ))
   OR (
        session.surface = 'control-panel'
        AND NOT EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_roles role ON role.id = assignment.role_id
            WHERE assignment.actor_id = actor.id
              AND role.active IS TRUE
              AND role.name NOT IN ('client', 'partner', 'field', 'captain')
        )
      )
  );

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM identity_role_permissions role_permission
        JOIN identity_038_obsolete_permission_ids obsolete ON obsolete.id = role_permission.permission_id
    ) OR EXISTS (
        SELECT 1
        FROM identity_actor_direct_permissions direct_permission
        JOIN identity_038_obsolete_permission_ids obsolete ON obsolete.id = direct_permission.permission_id
    ) OR EXISTS (
        SELECT 1
        FROM identity_permission_vocabulary vocabulary
        JOIN identity_038_obsolete_permission_ids obsolete ON obsolete.id = vocabulary.id
    ) OR EXISTS (
        SELECT 1
        FROM identity_actors AS actor
        CROSS JOIN LATERAL jsonb_array_elements(COALESCE(actor.permissions, '[]'::jsonb)) AS entry(value)
        WHERE entry.value->>'service' = 'dsh'
          AND entry.value->>'surface' IN ('app-client', 'app-partner')
          AND entry.value->>'action' IN ('store:read', 'store:write')
    ) THEN
        RAISE EXCEPTION
            'obsolete app-client/app-partner store permission residue remains';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM identity_activation_challenges
        WHERE actor_type = 'partner'
          AND status = 'pending'
          AND actor_id IS NOT NULL
          AND issued_by_actor_id = actor_id
    ) THEN
        RAISE EXCEPTION
            'legacy self-issued Partner OTP challenge residue remains';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM identity_sessions AS session
        JOIN identity_actors AS actor ON actor.id = session.actor_id
        WHERE session.revoked_at IS NULL
          AND (
              (session.surface = 'app-client'  AND NOT EXISTS (
                  SELECT 1 FROM identity_actor_roles assignment
                  JOIN identity_roles role ON role.id = assignment.role_id
                  WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'client'
              ))
           OR (session.surface = 'app-partner' AND NOT EXISTS (
                  SELECT 1 FROM identity_actor_roles assignment
                  JOIN identity_roles role ON role.id = assignment.role_id
                  WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'partner'
              ))
           OR (session.surface = 'app-field'   AND NOT EXISTS (
                  SELECT 1 FROM identity_actor_roles assignment
                  JOIN identity_roles role ON role.id = assignment.role_id
                  WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'field'
              ))
           OR (session.surface = 'app-captain' AND NOT EXISTS (
                  SELECT 1 FROM identity_actor_roles assignment
                  JOIN identity_roles role ON role.id = assignment.role_id
                  WHERE assignment.actor_id = actor.id AND role.active IS TRUE AND role.name = 'captain'
              ))
           OR (
                session.surface = 'control-panel'
                AND NOT EXISTS (
                    SELECT 1 FROM identity_actor_roles assignment
                    JOIN identity_roles role ON role.id = assignment.role_id
                    WHERE assignment.actor_id = actor.id
                      AND role.active IS TRUE
                      AND role.name NOT IN ('client', 'partner', 'field', 'captain')
                )
              )
          )
    ) THEN
        RAISE EXCEPTION
            'active session-surface/role mismatch residue remains';
    END IF;
END
$$;
