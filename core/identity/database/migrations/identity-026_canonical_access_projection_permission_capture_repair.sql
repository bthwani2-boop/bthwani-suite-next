-- identity-026_canonical_access_projection_permission_capture_repair.sql
--
-- Forward-repair the trigger function introduced by identity-025. The original
-- function compiled but failed during actor bootstrap because its PL/pgSQL
-- permission_id variable was ambiguous with SQL column references. Keep 025
-- immutable and repair both clean installs and databases that already recorded
-- the 025 migration through this idempotent replacement.

CREATE OR REPLACE FUNCTION identity_capture_actor_access_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    desired_role text;
    permission jsonb;
    captured_permission_id uuid;
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
        RETURNING id INTO captured_permission_id;

        IF NOT EXISTS (
            SELECT 1
            FROM identity_actor_roles assignment
            JOIN identity_role_permissions role_permission
              ON role_permission.role_id = assignment.role_id
             AND role_permission.permission_id = captured_permission_id
            WHERE assignment.actor_id = NEW.id
              AND role_permission.scope = btrim(permission->>'scope')
        ) THEN
            INSERT INTO identity_actor_direct_permissions(actor_id, permission_id, scope, granted_by)
            VALUES (
                NEW.id,
                captured_permission_id,
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
