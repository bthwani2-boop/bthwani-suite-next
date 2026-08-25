-- identity-040: remove development-only platform personas from production RBAC.
--
-- The local seed now provisions the three separated platform personas with
-- exact direct permissions and no Identity role assignment. The historical
-- role definitions and their grants therefore have no remaining production
-- consumer and must be removed, not merely deactivated.

BEGIN;

DO $$
BEGIN
    -- A pre-cutover development seed may have recreated the known fixtures
    -- after identity-039 ran. Remove only those fixture assignments/projection
    -- values; an unknown actor remains a hard failure below.
    DELETE FROM identity_actor_roles assignment
    USING identity_roles role
    WHERE role.id = assignment.role_id
      AND role.name IN (
          'platform-approver',
          'platform-applier',
          'platform-rollout-manager'
      )
      AND assignment.actor_id IN (
          'platform-approver-local-001',
          'platform-applier-local-001',
          'platform-rollout-manager-local-001'
      );

    UPDATE identity_actors
    SET roles = array_remove(
        array_remove(
            array_remove(roles, 'platform-approver'),
            'platform-applier'
        ),
        'platform-rollout-manager'
    )
    WHERE id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    );

    IF EXISTS (
        SELECT 1
        FROM identity_actor_roles assignment
        JOIN identity_roles role ON role.id = assignment.role_id
        WHERE role.name IN (
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        )
    ) THEN
        RAISE EXCEPTION 'local platform role assignments remain; refusing destructive role cleanup';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM identity_actors actor
        WHERE actor.roles && ARRAY[
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        ]::TEXT[]
    ) THEN
        RAISE EXCEPTION 'local platform role projection remains; refusing destructive role cleanup';
    END IF;
END
$$;

-- Remove the known role grants explicitly. No cascading delete is used: any remaining
-- actor assignment or future FK dependency must make this migration fail.
DELETE FROM identity_role_permissions role_permission
USING identity_roles role
WHERE role.id = role_permission.role_id
  AND role.name IN (
      'platform-approver',
      'platform-applier',
      'platform-rollout-manager'
  );

DELETE FROM identity_roles
WHERE name IN (
    'platform-approver',
    'platform-applier',
    'platform-rollout-manager'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM identity_roles
        WHERE name IN (
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        )
    ) THEN
        RAISE EXCEPTION 'local platform role definitions remain after cleanup';
    END IF;
END
$$;

COMMIT;
