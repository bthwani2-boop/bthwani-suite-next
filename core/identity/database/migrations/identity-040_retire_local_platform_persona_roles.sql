-- identity-040_retire_local_platform_persona_roles.sql
--
-- The platform-approver/platform-applier/platform-rollout-manager identities
-- and role names were development-only bootstrap personas, not product/domain
-- roles. Canonical platform-control authority is expressed by Identity-owned
-- permission vocabulary and governed role definitions, never by hard-coded
-- local personas. Retire their persisted actors and role definitions completely.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM identity_actor_roles assignment
        JOIN identity_roles role ON role.id = assignment.role_id
        WHERE role.name IN (
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        )
          AND assignment.actor_id NOT IN (
            'platform-approver-local-001',
            'platform-applier-local-001',
            'platform-rollout-manager-local-001'
        )
    ) THEN
        RAISE EXCEPTION 'local platform persona roles are assigned to non-fixture actors; refusing destructive retirement';
    END IF;
END
$$;

DELETE FROM identity_support_session_audit
WHERE target_actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    )
   OR initiator_actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    );

DELETE FROM identity_activation_challenges
WHERE actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    )
   OR issued_by_actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    );

DELETE FROM identity_actor_lifecycle_events
WHERE actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    )
   OR requested_by_actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    );

DELETE FROM identity_sessions
WHERE actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    )
   OR initiator_actor_id IN (
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
    );

DELETE FROM identity_login_attempts
WHERE username IN (
    'platform-approver',
    'platform-applier',
    'platform-rollout-manager'
);

DELETE FROM identity_actors
WHERE id IN (
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
);

-- The known RBAC foreign keys are ON DELETE CASCADE from identity_roles to
-- identity_actor_roles and identity_role_permissions. At this point the actor
-- assignments above are gone, and the precondition proved that no non-fixture
-- assignment exists, so deleting the definitions cannot revoke an unknown actor.
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
        FROM identity_actors
        WHERE id IN (
            'platform-approver-local-001',
            'platform-applier-local-001',
            'platform-rollout-manager-local-001'
        )
    ) THEN
        RAISE EXCEPTION 'retired local platform persona actors remain';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM identity_roles
        WHERE name IN (
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        )
    ) THEN
        RAISE EXCEPTION 'retired local platform persona role definitions remain';
    END IF;

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
        RAISE EXCEPTION 'retired local platform persona assignments remain';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM identity_actors actor
        CROSS JOIN LATERAL unnest(COALESCE(actor.roles, ARRAY[]::text[])) projected_role
        WHERE projected_role IN (
            'platform-approver',
            'platform-applier',
            'platform-rollout-manager'
        )
    ) THEN
        RAISE EXCEPTION 'retired local platform persona roles remain in actor projections';
    END IF;
END
$$;
