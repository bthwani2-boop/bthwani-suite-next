-- identity-025_canonical_access_projection.sql
--
-- Close the Identity authorization parallel-truth gap introduced when normalized
-- RBAC was added beside legacy identity_actors.roles / permissions columns.
--
-- Canonical persisted authority after this migration:
--   * identity_roles / identity_actor_roles: actor role assignments.
--   * identity_permission_vocabulary / identity_role_permissions: role grants.
--   * identity_actor_direct_permissions: actor-specific direct grants.
--
-- identity_actors.roles and identity_actors.permissions remain only as a
-- transactionally maintained compatibility/read projection for existing
-- Identity code and consumers. They are never an independent authority.

CREATE TABLE IF NOT EXISTS identity_actor_direct_permissions (
    actor_id text NOT NULL REFERENCES identity_actors(id) ON DELETE CASCADE,
    permission_id uuid NOT NULL REFERENCES identity_permission_vocabulary(id) ON DELETE CASCADE,
    scope varchar(64) NOT NULL,
    granted_by varchar(128) NOT NULL DEFAULT 'identity-direct-grant',
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (actor_id, permission_id, scope)
);

CREATE INDEX IF NOT EXISTS identity_actor_direct_permissions_actor_idx
    ON identity_actor_direct_permissions(actor_id);

-- Normalize every legacy role name before the role array becomes projection-only.
INSERT INTO identity_roles(name, description)
SELECT DISTINCT btrim(role_name), 'Backfilled Identity actor role'
FROM identity_actors actor
CROSS JOIN LATERAL unnest(actor.roles) AS role_name
WHERE btrim(role_name) <> ''
ON CONFLICT (name) DO NOTHING;

INSERT INTO identity_actor_roles(actor_id, role_id, granted_by)
SELECT actor.id, role.id, 'identity-access-cutover'
FROM identity_actors actor
CROSS JOIN LATERAL unnest(actor.roles) AS role_name
JOIN identity_roles role ON role.name = btrim(role_name)
ON CONFLICT (actor_id, role_id) DO NOTHING;

-- Remove impossible orphan role assignments before adding the ownership FK.
DELETE FROM identity_actor_roles assignment
WHERE NOT EXISTS (
    SELECT 1 FROM identity_actors actor WHERE actor.id = assignment.actor_id
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'identity_actor_roles_actor_fk'
          AND conrelid = 'identity_actor_roles'::regclass
    ) THEN
        ALTER TABLE identity_actor_roles
            ADD CONSTRAINT identity_actor_roles_actor_fk
            FOREIGN KEY (actor_id) REFERENCES identity_actors(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- Validate the old direct/effective JSON before using it as migration input.
DO $$
DECLARE
    invalid_actor_id text;
BEGIN
    SELECT actor.id
    INTO invalid_actor_id
    FROM identity_actors actor
    WHERE jsonb_typeof(actor.permissions) <> 'array'
       OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(actor.permissions) permission
            WHERE jsonb_typeof(permission) <> 'object'
               OR coalesce(btrim(permission->>'service'), '') = ''
               OR coalesce(btrim(permission->>'surface'), '') = ''
               OR coalesce(btrim(permission->>'action'), '') = ''
               OR coalesce(btrim(permission->>'scope'), '') = ''
       )
    LIMIT 1;

    IF invalid_actor_id IS NOT NULL THEN
        RAISE EXCEPTION 'identity actor % has malformed permission projection', invalid_actor_id;
    END IF;
END
$$;

INSERT INTO identity_permission_vocabulary(service, surface, action, description)
SELECT DISTINCT
    btrim(permission->>'service'),
    btrim(permission->>'surface'),
    btrim(permission->>'action'),
    'Backfilled Identity direct actor permission'
FROM identity_actors actor
CROSS JOIN LATERAL jsonb_array_elements(actor.permissions) permission
ON CONFLICT (service, surface, action) DO NOTHING;

-- Preserve only grants that are not already supplied by an assigned role.
-- This provenance split is what makes a future role revoke actually remove
-- role-derived authority instead of leaving the same permission as a shadow
-- direct grant.
INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
SELECT
    actor.id,
    vocabulary.id,
    btrim(permission->>'scope'),
    'identity-access-cutover'
FROM identity_actors actor
CROSS JOIN LATERAL jsonb_array_elements(actor.permissions) permission
JOIN identity_permission_vocabulary vocabulary
  ON vocabulary.service = btrim(permission->>'service')
 AND vocabulary.surface = btrim(permission->>'surface')
 AND vocabulary.action = btrim(permission->>'action')
WHERE NOT EXISTS (
    SELECT 1
    FROM identity_actor_roles assignment
    JOIN identity_role_permissions role_permission
      ON role_permission.role_id = assignment.role_id
     AND role_permission.permission_id = vocabulary.id
    WHERE assignment.actor_id = actor.id
      AND role_permission.scope = btrim(permission->>'scope')
)
ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;

CREATE OR REPLACE FUNCTION identity_effective_roles(p_actor_id text)
RETURNS text[]
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(array_agg(role.name ORDER BY role.name), ARRAY[]::text[])
    FROM identity_actor_roles assignment
    JOIN identity_roles role ON role.id = assignment.role_id
    WHERE assignment.actor_id = p_actor_id
$$;

CREATE OR REPLACE FUNCTION identity_effective_permissions(p_actor_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
    WITH effective AS (
        SELECT
            vocabulary.service,
            vocabulary.surface,
            vocabulary.action,
            direct_permission.scope
        FROM identity_actor_direct_permissions direct_permission
        JOIN identity_permission_vocabulary vocabulary
          ON vocabulary.id = direct_permission.permission_id
        WHERE direct_permission.actor_id = p_actor_id

        UNION

        SELECT
            vocabulary.service,
            vocabulary.surface,
            vocabulary.action,
            role_permission.scope
        FROM identity_actor_roles assignment
        JOIN identity_role_permissions role_permission
          ON role_permission.role_id = assignment.role_id
        JOIN identity_permission_vocabulary vocabulary
          ON vocabulary.id = role_permission.permission_id
        WHERE assignment.actor_id = p_actor_id
    )
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'service', service,
                'surface', surface,
                'action', action,
                'scope', scope
            )
            ORDER BY service, surface, action, scope
        ),
        '[]'::jsonb
    )
    FROM effective
$$;

CREATE OR REPLACE FUNCTION identity_rebuild_actor_access_projection(p_actor_id text)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('bthwani.identity_access_projection', '1', true);

    UPDATE identity_actors
    SET roles = identity_effective_roles(p_actor_id),
        permissions = identity_effective_permissions(p_actor_id),
        updated_at = now()
    WHERE id = p_actor_id;

    PERFORM set_config('bthwani.identity_access_projection', '0', true);
END
$$;

-- Capture existing Identity writers that still address the actor projection.
-- The trigger converts the requested effective state to normalized authority in
-- the same transaction and then rebuilds the projection deterministically.
CREATE OR REPLACE FUNCTION identity_capture_actor_access_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    desired_role text;
    permission jsonb;
    permission_id uuid;
BEGIN
    IF current_setting('bthwani.identity_access_projection', true) = '1' THEN
        RETURN NEW;
    END IF;

    IF NEW.roles IS NULL OR NEW.permissions IS NULL OR jsonb_typeof(NEW.permissions) <> 'array' THEN
        RAISE EXCEPTION 'identity actor access projection must contain roles and permission array';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM jsonb_array_elements(NEW.permissions) candidate
        WHERE jsonb_typeof(candidate) <> 'object'
           OR coalesce(btrim(candidate->>'service'), '') = ''
           OR coalesce(btrim(candidate->>'surface'), '') = ''
           OR coalesce(btrim(candidate->>'action'), '') = ''
           OR coalesce(btrim(candidate->>'scope'), '') = ''
    ) THEN
        RAISE EXCEPTION 'identity actor access projection contains malformed permission';
    END IF;

    PERFORM set_config('bthwani.identity_access_capture', '1', true);

    FOR desired_role IN
        SELECT DISTINCT btrim(value)
        FROM unnest(NEW.roles) value
        WHERE btrim(value) <> ''
    LOOP
        INSERT INTO identity_roles(name, description)
        VALUES (desired_role, 'Identity actor role')
        ON CONFLICT (name) DO NOTHING;
    END LOOP;

    DELETE FROM identity_actor_roles assignment
    WHERE assignment.actor_id = NEW.id
      AND NOT EXISTS (
          SELECT 1
          FROM unnest(NEW.roles) requested_role
          JOIN identity_roles role ON role.name = btrim(requested_role)
          WHERE role.id = assignment.role_id
      );

    INSERT INTO identity_actor_roles(actor_id, role_id, granted_by)
    SELECT NEW.id, role.id, 'identity-actor-access-boundary'
    FROM (
        SELECT DISTINCT btrim(value) AS role_name
        FROM unnest(NEW.roles) value
        WHERE btrim(value) <> ''
    ) requested
    JOIN identity_roles role ON role.name = requested.role_name
    ON CONFLICT (actor_id, role_id) DO NOTHING;

    DELETE FROM identity_actor_direct_permissions
    WHERE actor_id = NEW.id;

    FOR permission IN SELECT value FROM jsonb_array_elements(NEW.permissions)
    LOOP
        INSERT INTO identity_permission_vocabulary(service, surface, action, description)
        VALUES (
            btrim(permission->>'service'),
            btrim(permission->>'surface'),
            btrim(permission->>'action'),
            'Identity direct actor permission'
        )
        ON CONFLICT (service, surface, action)
        DO UPDATE SET description = identity_permission_vocabulary.description
        RETURNING id INTO permission_id;

        IF NOT EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_role_permissions role_permission
              ON role_permission.role_id = assignment.role_id
             AND role_permission.permission_id = permission_id
            WHERE assignment.actor_id = NEW.id
              AND role_permission.scope = btrim(permission->>'scope')
        ) THEN
            INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
            VALUES (
                NEW.id,
                permission_id,
                btrim(permission->>'scope'),
                'identity-actor-access-boundary'
            )
            ON CONFLICT (actor_id, permission_id, scope) DO NOTHING;
        END IF;
    END LOOP;

    PERFORM set_config('bthwani.identity_access_capture', '0', true);
    PERFORM identity_rebuild_actor_access_projection(NEW.id);
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('bthwani.identity_access_capture', '0', true);
    RAISE;
END
$$;

DROP TRIGGER IF EXISTS identity_actor_access_capture ON identity_actors;
CREATE TRIGGER identity_actor_access_capture
AFTER INSERT OR UPDATE OF roles, permissions
ON identity_actors
FOR EACH ROW
EXECUTE FUNCTION identity_capture_actor_access_projection();

CREATE OR REPLACE FUNCTION identity_project_actor_role_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affected_actor_id text;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        affected_actor_id := OLD.actor_id;
    ELSE
        affected_actor_id := NEW.actor_id;
        -- A role owns a grant when it supplies the exact same permission and scope;
        -- remove redundant direct copies so revocation remains effective.
        DELETE FROM identity_actor_direct_permissions direct_permission
        USING identity_role_permissions role_permission
        WHERE direct_permission.actor_id = NEW.actor_id
          AND role_permission.role_id = NEW.role_id
          AND direct_permission.permission_id = role_permission.permission_id
          AND direct_permission.scope = role_permission.scope;
    END IF;

    PERFORM identity_rebuild_actor_access_projection(affected_actor_id);
    IF TG_OP = 'UPDATE' AND OLD.actor_id IS DISTINCT FROM NEW.actor_id THEN
        PERFORM identity_rebuild_actor_access_projection(OLD.actor_id);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_actor_role_projection ON identity_actor_roles;
CREATE TRIGGER identity_actor_role_projection
AFTER INSERT OR UPDATE OR DELETE
ON identity_actor_roles
FOR EACH ROW
EXECUTE FUNCTION identity_project_actor_role_change();

CREATE OR REPLACE FUNCTION identity_project_direct_permission_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    affected_actor_id text;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;
    IF TG_OP = 'DELETE' THEN affected_actor_id := OLD.actor_id; ELSE affected_actor_id := NEW.actor_id; END IF;
    PERFORM identity_rebuild_actor_access_projection(affected_actor_id);
    IF TG_OP = 'UPDATE' AND OLD.actor_id IS DISTINCT FROM NEW.actor_id THEN
        PERFORM identity_rebuild_actor_access_projection(OLD.actor_id);
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_actor_direct_permission_projection ON identity_actor_direct_permissions;
CREATE TRIGGER identity_actor_direct_permission_projection
AFTER INSERT OR UPDATE OR DELETE
ON identity_actor_direct_permissions
FOR EACH ROW
EXECUTE FUNCTION identity_project_direct_permission_change();

CREATE OR REPLACE FUNCTION identity_project_role_permission_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_record record;
    changed_role_id uuid;
BEGIN
    IF current_setting('bthwani.identity_access_capture', true) = '1' THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN changed_role_id := OLD.role_id; ELSE changed_role_id := NEW.role_id; END IF;

    IF TG_OP <> 'DELETE' THEN
        DELETE FROM identity_actor_direct_permissions direct_permission
        USING identity_actor_roles assignment
        WHERE assignment.role_id = NEW.role_id
          AND assignment.actor_id = direct_permission.actor_id
          AND direct_permission.permission_id = NEW.permission_id
          AND direct_permission.scope = NEW.scope;
    END IF;

    FOR actor_record IN
        SELECT DISTINCT actor_id
        FROM identity_actor_roles
        WHERE role_id = changed_role_id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;

    IF TG_OP = 'UPDATE' AND OLD.role_id IS DISTINCT FROM NEW.role_id THEN
        FOR actor_record IN
            SELECT DISTINCT actor_id
            FROM identity_actor_roles
            WHERE role_id = OLD.role_id
        LOOP
            PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
        END LOOP;
    END IF;

    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_role_permission_projection ON identity_role_permissions;
CREATE TRIGGER identity_role_permission_projection
AFTER INSERT OR UPDATE OR DELETE
ON identity_role_permissions
FOR EACH ROW
EXECUTE FUNCTION identity_project_role_permission_change();

CREATE OR REPLACE FUNCTION identity_project_role_name_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_record record;
BEGIN
    IF NEW.name IS NOT DISTINCT FROM OLD.name THEN
        RETURN NEW;
    END IF;

    FOR actor_record IN
        SELECT actor_id
        FROM identity_actor_roles
        WHERE role_id = NEW.id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_role_name_projection ON identity_roles;
CREATE TRIGGER identity_role_name_projection
AFTER UPDATE OF name
ON identity_roles
FOR EACH ROW
EXECUTE FUNCTION identity_project_role_name_change();

CREATE OR REPLACE FUNCTION identity_project_permission_vocabulary_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    actor_record record;
BEGIN
    IF NEW.service IS NOT DISTINCT FROM OLD.service
       AND NEW.surface IS NOT DISTINCT FROM OLD.surface
       AND NEW.action IS NOT DISTINCT FROM OLD.action THEN
        RETURN NEW;
    END IF;

    FOR actor_record IN
        SELECT actor_id
        FROM identity_actor_direct_permissions
        WHERE permission_id = NEW.id
        UNION
        SELECT assignment.actor_id
        FROM identity_actor_roles assignment
        JOIN identity_role_permissions role_permission
          ON role_permission.role_id = assignment.role_id
        WHERE role_permission.permission_id = NEW.id
    LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.actor_id);
    END LOOP;
    RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS identity_permission_vocabulary_projection ON identity_permission_vocabulary;
CREATE TRIGGER identity_permission_vocabulary_projection
AFTER UPDATE OF service, surface, action
ON identity_permission_vocabulary
FOR EACH ROW
EXECUTE FUNCTION identity_project_permission_vocabulary_change();

-- Rebuild every actor once under the canonical model.
DO $$
DECLARE
    actor_record record;
BEGIN
    FOR actor_record IN SELECT id FROM identity_actors LOOP
        PERFORM identity_rebuild_actor_access_projection(actor_record.id);
    END LOOP;
END
$$;

COMMENT ON COLUMN identity_actors.roles IS
    'Derived projection of identity_actor_roles. Canonical role writes belong to normalized Identity RBAC.';
COMMENT ON COLUMN identity_actors.permissions IS
    'Derived effective projection: direct actor grants union assigned-role grants. Canonical direct grants live in identity_actor_direct_permissions.';

-- Fail closed if the cutover left any projection drift.
DO $$
DECLARE
    drift_actor_id text;
BEGIN
    SELECT actor.id
    INTO drift_actor_id
    FROM identity_actors actor
    WHERE actor.roles IS DISTINCT FROM identity_effective_roles(actor.id)
       OR actor.permissions IS DISTINCT FROM identity_effective_permissions(actor.id)
    LIMIT 1;

    IF drift_actor_id IS NOT NULL THEN
        RAISE EXCEPTION 'identity access projection drift remains for actor %', drift_actor_id;
    END IF;
END
$$;
