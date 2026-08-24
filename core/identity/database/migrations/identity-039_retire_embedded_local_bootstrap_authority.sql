-- identity-039_retire_embedded_local_bootstrap_authority.sql
--
-- Permanently retire persisted authority created by the historical embedded
-- Identity local-development bootstrap. The production-capable identity-api no
-- longer contains that writer; this migration removes any authority/data it may
-- already have materialized. Canonical local development may recreate only the
-- six fixture actors after migrations via the separately authorized one-shot
-- identity-local-bootstrap command.

-- The three platform-* roles are explicitly local-development vocabulary
-- (identity-035). They remain definitions so the one-shot development bootstrap
-- can consume canonical RBAC vocabulary, but they must never be assigned to
-- non-fixture actors.
DELETE FROM identity_actor_roles assignment
USING identity_roles role
WHERE assignment.role_id = role.id
  AND role.name IN (
    'platform-approver',
    'platform-applier',
    'platform-rollout-manager'
  )
  AND assignment.actor_id NOT IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

-- Rows below contain operational/audit effects produced by development-only
-- fixture identities. They cannot be retained as production truth because the
-- corresponding actors were never valid production authorities. Remove the
-- explicit RESTRICT/NO ACTION references before deleting the actors.
DELETE FROM identity_support_session_audit
WHERE target_actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  )
   OR initiator_actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

DELETE FROM identity_activation_challenges
WHERE actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  )
   OR issued_by_actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

DELETE FROM identity_actor_lifecycle_events
WHERE actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  )
   OR requested_by_actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

DELETE FROM identity_sessions
WHERE actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  )
   OR initiator_actor_id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

DELETE FROM identity_login_attempts
WHERE username IN (
    'operator',
    'bthwani',
    'client',
    'platform-approver',
    'platform-applier',
    'platform-rollout-manager'
  );

-- identity_actor_roles, identity_actor_direct_permissions, lifecycle rows and
-- subject sessions are all FK-owned by identity_actors and cascade from here.
DELETE FROM identity_actors
WHERE id IN (
    'operator-local-001',
    'partner-local-001',
    'client-local-001',
    'platform-approver-local-001',
    'platform-applier-local-001',
    'platform-rollout-manager-local-001'
  );

-- Fail closed if any active or derived authority survived the cutover.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM identity_actors
    WHERE id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
  ) THEN
    RAISE EXCEPTION 'retired local bootstrap actors remain in identity_actors';
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
      AND assignment.actor_id NOT IN (
        'operator-local-001',
        'partner-local-001',
        'client-local-001',
        'platform-approver-local-001',
        'platform-applier-local-001',
        'platform-rollout-manager-local-001'
      )
  ) THEN
    RAISE EXCEPTION 'local platform roles remain assigned to non-fixture actors';
  END IF;

  IF EXISTS (
    SELECT 1 FROM identity_sessions
    WHERE actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
       OR initiator_actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
  ) THEN
    RAISE EXCEPTION 'retired local bootstrap sessions remain';
  END IF;

  IF EXISTS (
    SELECT 1 FROM identity_activation_challenges
    WHERE actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
       OR issued_by_actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
  ) THEN
    RAISE EXCEPTION 'retired local bootstrap activation authority remains';
  END IF;

  IF EXISTS (
    SELECT 1 FROM identity_support_session_audit
    WHERE target_actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
       OR initiator_actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
  ) THEN
    RAISE EXCEPTION 'retired local bootstrap support-session audit authority remains';
  END IF;

  IF EXISTS (
    SELECT 1 FROM identity_actor_lifecycle_events
    WHERE actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
       OR requested_by_actor_id IN (
      'operator-local-001',
      'partner-local-001',
      'client-local-001',
      'platform-approver-local-001',
      'platform-applier-local-001',
      'platform-rollout-manager-local-001'
    )
  ) THEN
    RAISE EXCEPTION 'retired local bootstrap lifecycle authority remains';
  END IF;
END
$$;
