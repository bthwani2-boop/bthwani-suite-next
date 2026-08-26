-- Workforce-029: durable lifecycle (suspend/reactivate) identity saga.
--
-- Workforce owns the engagement projection; Identity owns authentication. A
-- suspend/reactivate is a cross-sovereign command: the local status change and
-- the identity deactivation/reactivation cannot share one transaction. Before
-- this migration the intent lived only in process memory, so a crash between
-- the local commit and the identity outcome left contradictory sovereign
-- states with no recovery record. This table makes the intent durable in the
-- SAME governed transaction as the local status change and its audit, and a
-- reconciler drives every command to a terminal disposition
-- (COMPLETED / COMPENSATED / SUPERSEDED / FAILED).
--
-- Identity replay contract: identity SuspendActor/ReactivateActor return
-- success for a repeated request carrying the same (requested_by_actor_id,
-- reason, correlation_id), so reconciler retries with the stored parameters
-- are idempotent and converge.

CREATE TABLE workforce_lifecycle_commands (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_context_id      text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  actor_id                 text NOT NULL CHECK (NULLIF(BTRIM(actor_id), '') IS NOT NULL),
  operation                text NOT NULL CHECK (operation IN ('suspend','reactivate')),
  from_status              text NOT NULL CHECK (from_status IN ('active','suspended','terminated')),
  to_status                text NOT NULL CHECK (to_status IN ('active','suspended')),
  person_version_after     integer NOT NULL CHECK (person_version_after > 0),
  reason                   text NOT NULL CHECK (CHAR_LENGTH(BTRIM(reason)) >= 3),
  requested_by_actor_id    text NOT NULL CHECK (NULLIF(BTRIM(requested_by_actor_id), '') IS NOT NULL),
  requested_by_role        text NOT NULL CHECK (NULLIF(BTRIM(requested_by_role), '') IS NOT NULL),
  correlation_id           text NOT NULL CHECK (NULLIF(BTRIM(correlation_id), '') IS NOT NULL),
  command_idempotency_key  text NOT NULL CHECK (NULLIF(BTRIM(command_idempotency_key), '') IS NOT NULL),
  lifecycle_state          text NOT NULL CHECK (lifecycle_state IN (
    'IN_FLIGHT','RETRY_SCHEDULED','COMPLETED','COMPENSATED','SUPERSEDED','FAILED'
  )),
  attempt_count            integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  lease_token              uuid,
  lease_owner              text,
  lease_expires_at         timestamptz,
  next_retry_at            timestamptz NOT NULL DEFAULT now(),
  last_attempt_at          timestamptz,
  last_error_code          text NOT NULL DEFAULT '',
  last_error               text NOT NULL DEFAULT '',
  remote_confirmed_at      timestamptz,
  terminal_disposition     text NOT NULL DEFAULT '',
  completed_at             timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_context_id, command_idempotency_key),
  CHECK ((operation = 'suspend' AND to_status = 'suspended' AND from_status <> 'suspended')
      OR (operation = 'reactivate' AND to_status = 'active' AND from_status = 'suspended')),
  CHECK ((lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
      OR (lease_token IS NOT NULL AND NULLIF(BTRIM(lease_owner), '') IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK ((lifecycle_state IN ('COMPLETED','COMPENSATED','SUPERSEDED','FAILED'))
         = (NULLIF(BTRIM(terminal_disposition), '') IS NOT NULL))
);

-- Reconciler recovery scan: un-terminal commands whose retry window opened.
CREATE INDEX workforce_lifecycle_commands_recovery_idx
  ON workforce_lifecycle_commands(lifecycle_state, next_retry_at, created_at)
  WHERE lifecycle_state IN ('IN_FLIGHT','RETRY_SCHEDULED');

-- At most one non-terminal lifecycle command per actor+operation: the local
-- write is version-fenced, so a second intent for the same actor must wait.
CREATE UNIQUE INDEX workforce_lifecycle_commands_open_uidx
  ON workforce_lifecycle_commands(operator_context_id, actor_id, operation)
  WHERE lifecycle_state IN ('IN_FLIGHT','RETRY_SCHEDULED');

-- Audit linkage: the governed unit that inserts the command pins the audit row.
ALTER TABLE workforce_action_audit
  ADD COLUMN lifecycle_command_id uuid REFERENCES workforce_lifecycle_commands(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX workforce_action_audit_lifecycle_command_uidx
  ON workforce_action_audit(lifecycle_command_id)
  WHERE lifecycle_command_id IS NOT NULL;

COMMENT ON TABLE workforce_lifecycle_commands IS
  'Durable Workforce intent/recovery authority for cross-sovereign suspend/reactivate identity commands; one terminal disposition per command, driven to convergence by the reconciler.';
