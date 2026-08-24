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

UPDATE identity_actors AS actor
SET permissions = (
        SELECT COALESCE(
            jsonb_agg(entry.value ORDER BY entry.ordinality),
            '[]'::jsonb
        )
        FROM jsonb_array_elements(COALESCE(actor.permissions, '[]'::jsonb))
             WITH ORDINALITY AS entry(value, ordinality)
        WHERE NOT (
            entry.value->>'service' = 'dsh'
            AND entry.value->>'surface' IN ('app-client', 'app-partner')
            AND entry.value->>'action' IN ('store:read', 'store:write')
        )
    ),
    version = actor.version + 1,
    updated_at = now()
WHERE EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(actor.permissions, '[]'::jsonb)) AS entry(value)
    WHERE entry.value->>'service' = 'dsh'
      AND entry.value->>'surface' IN ('app-client', 'app-partner')
      AND entry.value->>'action' IN ('store:read', 'store:write')
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
      (session.surface = 'app-client'  AND NOT ('client'  = ANY(actor.roles)))
   OR (session.surface = 'app-partner' AND NOT ('partner' = ANY(actor.roles)))
   OR (session.surface = 'app-field'   AND NOT ('field'   = ANY(actor.roles)))
   OR (session.surface = 'app-captain' AND NOT ('captain' = ANY(actor.roles)))
   OR (
        session.surface = 'control-panel'
        AND NOT EXISTS (
            SELECT 1
            FROM unnest(actor.roles) AS role(name)
            WHERE role.name NOT IN ('client', 'partner', 'field', 'captain')
        )
      )
  );

DO $$
BEGIN
    IF EXISTS (
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
              (session.surface = 'app-client'  AND NOT ('client'  = ANY(actor.roles)))
           OR (session.surface = 'app-partner' AND NOT ('partner' = ANY(actor.roles)))
           OR (session.surface = 'app-field'   AND NOT ('field'   = ANY(actor.roles)))
           OR (session.surface = 'app-captain' AND NOT ('captain' = ANY(actor.roles)))
           OR (
                session.surface = 'control-panel'
                AND NOT EXISTS (
                    SELECT 1
                    FROM unnest(actor.roles) AS role(name)
                    WHERE role.name NOT IN ('client', 'partner', 'field', 'captain')
                )
              )
          )
    ) THEN
        RAISE EXCEPTION
            'active session-surface/role mismatch residue remains';
    END IF;
END
$$;
