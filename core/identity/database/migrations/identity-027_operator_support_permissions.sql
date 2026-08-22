-- identity-027_operator_support_permissions.sql
--
-- Register the support ticket boundary in canonical Identity RBAC. The local
-- operator exercises this boundary through the same permission checks as a
-- deployed control-panel operator; no route-level bypass is allowed.

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'support.read', 'Read governed operator support tickets'),
    ('dsh', 'control-panel', 'support.manage', 'Manage governed operator support tickets')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

INSERT INTO identity_roles(name, description)
VALUES ('operator', 'Control-panel operator')
ON CONFLICT (name) DO NOTHING;

INSERT INTO identity_role_permissions(role_id, permission_id, scope)
SELECT role.id, permission.id, 'all'
FROM identity_roles role
JOIN identity_permission_vocabulary permission
  ON permission.service = 'dsh'
 AND permission.surface = 'control-panel'
 AND permission.action IN ('support.read', 'support.manage')
WHERE role.name = 'operator'
ON CONFLICT (role_id, permission_id)
DO UPDATE SET scope = EXCLUDED.scope;

-- Role-permission triggers rebuild assigned actor projections. Rebuild once more
-- explicitly so this migration is correct on databases whose trigger set was
-- repaired by identity-026 after the original RBAC cutover.
DO $$
DECLARE
    actor_record record;
BEGIN
    FOR actor_record IN
        SELECT DISTINCT assignment.actor_id
        FROM identity_actor_roles assignment
        JOIN identity_roles role ON role.id = assignment.role_id
        WHERE role.name = 'operator'
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;
END
$$;

-- Fail closed if either the canonical role grant or any assigned actor
-- projection is still missing the support boundary.
DO $$
DECLARE
    missing_action text;
    missing_actor text;
BEGIN
    SELECT required.action
    INTO missing_action
    FROM (VALUES ('support.read'), ('support.manage')) AS required(action)
    WHERE NOT EXISTS (
        SELECT 1
        FROM identity_roles role
        JOIN identity_role_permissions role_permission ON role_permission.role_id = role.id
        JOIN identity_permission_vocabulary permission ON permission.id = role_permission.permission_id
        WHERE role.name = 'operator'
          AND permission.service = 'dsh'
          AND permission.surface = 'control-panel'
          AND permission.action = required.action
          AND role_permission.scope = 'all'
    )
    LIMIT 1;

    IF missing_action IS NOT NULL THEN
        RAISE EXCEPTION 'operator role is missing canonical support permission %', missing_action;
    END IF;

    SELECT actor.id
    INTO missing_actor
    FROM identity_actors actor
    JOIN identity_actor_roles assignment ON assignment.actor_id = actor.id
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE role.name = 'operator'
      AND EXISTS (
          SELECT 1
          FROM (VALUES ('support.read'), ('support.manage')) AS required(action)
          WHERE NOT EXISTS (
              SELECT 1
              FROM jsonb_array_elements(actor.permissions) projected
              WHERE projected->>'service' = 'dsh'
                AND projected->>'surface' = 'control-panel'
                AND projected->>'action' = required.action
                AND projected->>'scope' = 'all'
          )
      )
    LIMIT 1;

    IF missing_actor IS NOT NULL THEN
        RAISE EXCEPTION 'operator actor % is missing canonical support permission projection', missing_actor;
    END IF;
END
$$;
