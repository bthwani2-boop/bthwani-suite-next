-- identity-045: make the live DSH catalog-approval routes issuable by the
-- canonical Identity owner and backfill the sovereign platform-owner actors.
--
-- The DSH handlers already enforce these exact actions. Keeping them absent
-- from Identity vocabulary made the protected route permanently unreachable
-- for the only administrative bundle that owns the complete catalog surface.

BEGIN;

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'catalog.approval.read', 'Canonical capability consumed by Identity access policy: catalog.approval.read'),
    ('dsh', 'control-panel', 'catalog.approval.manage', 'Canonical capability consumed by Identity access policy: catalog.approval.manage')
ON CONFLICT (service, surface, action) DO NOTHING;

-- Existing platform-owner actors receive the same exact direct grants that
-- Identity issues for newly provisioned platform owners. Normalized RBAC is
-- the source of truth; the JSON actor projection is rebuilt by the canonical
-- projection function below.
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT actor.id, vocabulary.id, 'all', 'identity-045-catalog-approval'
FROM identity_actors actor
CROSS JOIN (VALUES ('catalog.approval.read'), ('catalog.approval.manage')) AS required(action)
JOIN identity_permission_vocabulary vocabulary
  ON vocabulary.service = 'dsh'
 AND vocabulary.surface = 'control-panel'
 AND vocabulary.action = required.action
WHERE EXISTS (
    SELECT 1
    FROM identity_actor_roles assignment
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE assignment.actor_id = actor.id
      AND role.active IS TRUE
      AND role.name = 'employee'
)
AND EXISTS (
    SELECT 1
    FROM identity_actor_roles assignment
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE assignment.actor_id = actor.id
      AND role.active IS TRUE
      AND role.name = 'operator'
)
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

DO $$
DECLARE
    actor_id text;
BEGIN
    FOR actor_id IN
        SELECT actor.id
        FROM identity_actors actor
        WHERE EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_roles role ON role.id = assignment.role_id
            WHERE assignment.actor_id = actor.id
              AND role.active IS TRUE
              AND role.name = 'employee'
        )
        AND EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_roles role ON role.id = assignment.role_id
            WHERE assignment.actor_id = actor.id
              AND role.active IS TRUE
              AND role.name = 'operator'
        )
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_id);
    END LOOP;
END
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM identity_actors actor
        WHERE EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_roles role ON role.id = assignment.role_id
            WHERE assignment.actor_id = actor.id
              AND role.active IS TRUE
              AND role.name = 'employee'
        )
        AND EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_roles role ON role.id = assignment.role_id
            WHERE assignment.actor_id = actor.id
              AND role.active IS TRUE
              AND role.name = 'operator'
        )
        AND NOT EXISTS (
            SELECT 1
            FROM identity_actor_direct_permissions direct_permission
            JOIN identity_permission_vocabulary vocabulary
              ON vocabulary.id = direct_permission.permission_id
            WHERE direct_permission.actor_id = actor.id
              AND direct_permission.scope = 'all'
              AND vocabulary.service = 'dsh'
              AND vocabulary.surface = 'control-panel'
              AND vocabulary.action IN ('catalog.approval.read', 'catalog.approval.manage')
            GROUP BY direct_permission.actor_id
            HAVING COUNT(*) = 2
        )
    ) THEN
        RAISE EXCEPTION 'platform-owner catalog approval permissions are incomplete';
    END IF;
END
$$;

COMMIT;
