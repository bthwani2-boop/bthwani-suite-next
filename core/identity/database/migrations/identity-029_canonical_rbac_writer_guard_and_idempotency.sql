-- identity-029_canonical_rbac_writer_guard_and_idempotency.sql
--
-- Identity owns normalized RBAC writes. The legacy roles/permissions columns
-- remain a derived read projection for session compatibility, but no longer
-- convert arbitrary projection writes into authority.

ALTER TABLE identity_roles
    ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE identity_roles
    DROP CONSTRAINT IF EXISTS identity_roles_version_positive;
ALTER TABLE identity_roles
    ADD CONSTRAINT identity_roles_version_positive CHECK (version > 0);

-- Complete the fine-grained administration vocabulary in the forward cutover.
-- The historical 028 migration remains immutable; these rows are the live
-- vocabulary consumed by DSH after the role/approval read aliases disappear.
INSERT INTO identity_permission_vocabulary(service, surface, action, description)
VALUES
    ('dsh', 'control-panel', 'administration.partner.read', 'Read partner administration projections'),
    ('dsh', 'control-panel', 'administration.captain.read', 'Read captain administration projections'),
    ('dsh', 'control-panel', 'finance.payout_destinations.verify', 'Verify an administrative payout destination'),
    ('dsh', 'control-panel', 'finance.payout_destinations.deactivate', 'Deactivate an administrative payout destination')
ON CONFLICT (service, surface, action)
DO UPDATE SET description = EXCLUDED.description;

-- Historical queue-read aliases are deliberately collapsed into the checker
-- authority. No compatibility alias remains in the live vocabulary.
WITH alias_map(alias_action, exact_action) AS (
    VALUES
        ('administration.approval.read', 'administration.staff.approve'),
        ('administration.rollback.read', 'administration.rollback.approve')
)
INSERT INTO identity_role_permissions(role_id, permission_id, scope)
SELECT binding.role_id, exact_permission.id, binding.scope
FROM identity_role_permissions binding
JOIN identity_permission_vocabulary alias_permission ON alias_permission.id = binding.permission_id
JOIN alias_map ON alias_map.alias_action = alias_permission.action
JOIN identity_permission_vocabulary exact_permission
  ON exact_permission.service = alias_permission.service
 AND exact_permission.surface = alias_permission.surface
 AND exact_permission.action = alias_map.exact_action
ON CONFLICT (role_id, permission_id) DO UPDATE SET scope = EXCLUDED.scope;

WITH alias_map(alias_action, exact_action) AS (
    VALUES
        ('administration.approval.read', 'administration.staff.approve'),
        ('administration.rollback.read', 'administration.rollback.approve')
)
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT grant_row.actor_id, exact_permission.id, grant_row.scope, 'administration-rbac-alias-removal'
FROM identity_actor_direct_permissions grant_row
JOIN identity_permission_vocabulary alias_permission ON alias_permission.id = grant_row.permission_id
JOIN alias_map ON alias_map.alias_action = alias_permission.action
JOIN identity_permission_vocabulary exact_permission
  ON exact_permission.service = alias_permission.service
 AND exact_permission.surface = alias_permission.surface
 AND exact_permission.action = alias_map.exact_action
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

DELETE FROM identity_role_permissions binding
USING identity_permission_vocabulary permission
WHERE permission.id = binding.permission_id
  AND permission.service = 'dsh'
  AND permission.surface = 'control-panel'
  AND permission.action IN ('administration.approval.read', 'administration.rollback.read');

DELETE FROM identity_actor_direct_permissions grant_row
USING identity_permission_vocabulary permission
WHERE permission.id = grant_row.permission_id
  AND permission.service = 'dsh'
  AND permission.surface = 'control-panel'
  AND permission.action IN ('administration.approval.read', 'administration.rollback.read');

DELETE FROM identity_permission_vocabulary
WHERE service = 'dsh'
  AND surface = 'control-panel'
  AND action IN ('administration.approval.read', 'administration.rollback.read');

-- Inactive roles retain their definitions and assignments for audit, but never
-- contribute executable authority to either the read projection or resolver.
CREATE OR REPLACE FUNCTION identity_effective_roles(p_actor_id text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(array_agg(role.name ORDER BY role.name), ARRAY[]::text[])
    FROM identity_actor_roles assignment
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE assignment.actor_id = p_actor_id
      AND role.active = true
$$;

CREATE OR REPLACE FUNCTION identity_effective_permissions(p_actor_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH effective AS (
        SELECT vocabulary.service, vocabulary.surface, vocabulary.action, direct_permission.scope
        FROM identity_actor_direct_permissions direct_permission
        JOIN identity_permission_vocabulary vocabulary ON vocabulary.id = direct_permission.permission_id
        WHERE direct_permission.actor_id = p_actor_id
        UNION
        SELECT vocabulary.service, vocabulary.surface, vocabulary.action, role_permission.scope
        FROM identity_actor_roles assignment
        JOIN identity_roles role ON role.id = assignment.role_id AND role.active = true
        JOIN identity_role_permissions role_permission ON role_permission.role_id = role.id
        JOIN identity_permission_vocabulary vocabulary ON vocabulary.id = role_permission.permission_id
        WHERE assignment.actor_id = p_actor_id
    )
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'service', service, 'surface', surface, 'action', action, 'scope', scope
    ) ORDER BY service, surface, action, scope), '[]'::jsonb)
    FROM effective
$$;

CREATE TABLE IF NOT EXISTS identity_rbac_operation_ledger (
    caller text NOT NULL,
    operation text NOT NULL,
    idempotency_key varchar(255) NOT NULL,
    request_hash char(64) NOT NULL,
    status varchar(32) NOT NULL CHECK (status IN ('processing', 'succeeded')),
    result jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (caller, operation, idempotency_key),
    CHECK (status <> 'succeeded' OR result IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS identity_rbac_operation_ledger_updated_idx
    ON identity_rbac_operation_ledger(updated_at);

-- A canonical writer sets this transaction-local flag while updating the
-- derived projection. Any other UPDATE attempting to alter either projection
-- column fails closed. Inserts must start with an empty projection; the
-- canonical writer populates normalized authority and rebuilds it atomically.
CREATE OR REPLACE FUNCTION identity_guard_actor_access_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF current_setting('bthwani.identity_access_projection', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'INSERT' THEN
        IF COALESCE(NEW.roles, ARRAY[]::text[]) = ARRAY[]::text[]
           AND COALESCE(NEW.permissions, '[]'::jsonb) = '[]'::jsonb THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
    END IF;

    IF NEW.roles IS DISTINCT FROM OLD.roles
       OR NEW.permissions IS DISTINCT FROM OLD.permissions THEN
        RAISE EXCEPTION 'identity actor access projection is read-only; use the canonical Identity RBAC writer';
    END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_actor_access_capture ON identity_actors;
DROP TRIGGER IF EXISTS identity_actor_access_projection_guard ON identity_actors;
DROP FUNCTION IF EXISTS identity_capture_actor_access_projection();

DO $$
DECLARE
    invalid_role text;
BEGIN
    SELECT btrim(role_name)
    INTO invalid_role
    FROM identity_actors actor
    CROSS JOIN LATERAL unnest(COALESCE(actor.roles, ARRAY[]::text[])) role_name
    WHERE btrim(role_name) <> ''
      AND NOT EXISTS (SELECT 1 FROM identity_roles role WHERE role.name = btrim(role_name))
    LIMIT 1;
    IF invalid_role IS NOT NULL THEN
        RAISE EXCEPTION 'identity actor projection references unknown role %', invalid_role;
    END IF;
END
$$;

DO $$
DECLARE
    actor_record record;
BEGIN
    FOR actor_record IN SELECT id FROM identity_actors LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.id);
    END LOOP;
END
$$;

CREATE TRIGGER identity_actor_access_projection_guard
BEFORE INSERT OR UPDATE OF roles, permissions
ON identity_actors
FOR EACH ROW
EXECUTE FUNCTION identity_guard_actor_access_projection();

COMMENT ON TABLE identity_rbac_operation_ledger IS
    'Durable exactly-once ledger for Identity-owned governed RBAC mutations.';
COMMENT ON COLUMN identity_roles.active IS
    'Inactive role definitions remain readable for audit but do not grant executable authority.';
COMMENT ON COLUMN identity_roles.version IS
    'Monotonic optimistic-concurrency version for governed role-definition writes.';
