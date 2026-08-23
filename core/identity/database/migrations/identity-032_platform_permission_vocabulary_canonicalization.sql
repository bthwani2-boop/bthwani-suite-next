-- identity-032: normalize the historical dot-delimited platform read action
-- into the canonical colon-delimited permission without rewriting immutable
-- identity-011/017 migrations.

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES ('dsh', 'control-panel', 'platform:read', 'Read platform policy projections')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT actor.id, canonical_permission.id, btrim(projection_permission->>'scope'),
       'identity-032-platform-read-canonicalization'
FROM identity_actors actor
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(actor.permissions, '[]'::jsonb)) projection_permission
CROSS JOIN identity_permission_vocabulary canonical_permission
WHERE canonical_permission.service = 'dsh'
  AND canonical_permission.surface = 'control-panel'
  AND canonical_permission.action = 'platform:read'
  AND projection_permission->>'service' = 'dsh'
  AND projection_permission->>'surface' = 'control-panel'
  AND projection_permission->>'action' = 'platform.read'
  AND btrim(projection_permission->>'scope') <> ''
  AND NOT EXISTS (
      SELECT 1
      FROM identity_actor_roles assignment
      JOIN identity_role_permissions role_permission ON role_permission.role_id = assignment.role_id
      JOIN identity_permission_vocabulary legacy_permission ON legacy_permission.id = role_permission.permission_id
      WHERE assignment.actor_id = actor.id
        AND legacy_permission.service = 'dsh'
        AND legacy_permission.surface = 'control-panel'
        AND legacy_permission.action = 'platform.read'
        AND role_permission.scope = btrim(projection_permission->>'scope')
  )
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

WITH legacy_permission AS (
    SELECT id FROM identity_permission_vocabulary
    WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform.read'
), canonical_permission AS (
    SELECT id FROM identity_permission_vocabulary
    WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform:read'
)
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
SELECT binding.role_id, canonical_permission.id, binding.scope
FROM identity_role_permissions binding
JOIN legacy_permission ON legacy_permission.id = binding.permission_id
CROSS JOIN canonical_permission
ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;

DELETE FROM identity_role_permissions binding
USING identity_permission_vocabulary permission
WHERE permission.id = binding.permission_id
  AND permission.service = 'dsh' AND permission.surface = 'control-panel'
  AND permission.action = 'platform.read';

WITH legacy_permission AS (
    SELECT id FROM identity_permission_vocabulary
    WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform.read'
), canonical_permission AS (
    SELECT id FROM identity_permission_vocabulary
    WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform:read'
)
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT grant_row.actor_id, canonical_permission.id, grant_row.scope, grant_row.granted_by
FROM identity_actor_direct_permissions grant_row
JOIN legacy_permission ON legacy_permission.id = grant_row.permission_id
CROSS JOIN canonical_permission
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

DELETE FROM identity_actor_direct_permissions grant_row
USING identity_permission_vocabulary permission
WHERE permission.id = grant_row.permission_id
  AND permission.service = 'dsh' AND permission.surface = 'control-panel'
  AND permission.action = 'platform.read';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM identity_role_permissions binding
        JOIN identity_permission_vocabulary permission ON permission.id = binding.permission_id
        WHERE permission.service = 'dsh' AND permission.surface = 'control-panel' AND permission.action = 'platform.read'
    ) THEN
        RAISE EXCEPTION 'platform.read role bindings remain after canonicalization';
    END IF;
    IF EXISTS (
        SELECT 1 FROM identity_actor_direct_permissions grant_row
        JOIN identity_permission_vocabulary permission ON permission.id = grant_row.permission_id
        WHERE permission.service = 'dsh' AND permission.surface = 'control-panel' AND permission.action = 'platform.read'
    ) THEN
        RAISE EXCEPTION 'platform.read direct grants remain after canonicalization';
    END IF;
END
$$;

DELETE FROM identity_permission_vocabulary
WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform.read';

DO $$
DECLARE actor_id text;
BEGIN
    FOR actor_id IN SELECT id FROM identity_actors LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_id);
    END LOOP;
END
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM identity_permission_vocabulary
        WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform:read'
    ) THEN
        RAISE EXCEPTION 'platform:read permission vocabulary is missing after canonicalization';
    END IF;
    IF EXISTS (
        SELECT 1 FROM identity_permission_vocabulary
        WHERE service = 'dsh' AND surface = 'control-panel' AND action = 'platform.read'
    ) THEN
        RAISE EXCEPTION 'platform.read permission vocabulary remains after canonicalization';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM identity_actors actor
        CROSS JOIN LATERAL jsonb_array_elements(actor.permissions) permission
        WHERE permission->>'service' = 'dsh'
          AND permission->>'surface' = 'control-panel'
          AND permission->>'action' = 'platform.read'
    ) THEN
        RAISE EXCEPTION 'platform.read actor projections remain after canonicalization';
    END IF;
END
$$;
