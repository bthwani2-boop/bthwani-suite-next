-- Workforce-028: durable provider-penalty financial saga.
-- Workforce owns command intent and the incident projection; WLT remains the
-- sole financial writer and authoritative penalty/ledger readback.

CREATE TABLE workforce_provider_penalty_commands (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_context_id           text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  incident_id                   uuid NOT NULL REFERENCES workforce_provider_incidents(id) ON DELETE RESTRICT,
  incident_source_version       integer NOT NULL CHECK (incident_source_version > 0),
  operation                     text NOT NULL CHECK (operation IN ('post','reverse')),
  requested_to_status           text NOT NULL CHECK (requested_to_status IN ('financial_action_posted','reversed')),
  command_idempotency_key       text NOT NULL CHECK (NULLIF(BTRIM(command_idempotency_key), '') IS NOT NULL),
  client_idempotency_key        text NOT NULL CHECK (NULLIF(BTRIM(client_idempotency_key), '') IS NOT NULL),
  request_hash                  text NOT NULL CHECK (NULLIF(BTRIM(request_hash), '') IS NOT NULL),
  provider_actor_id             text NOT NULL CHECK (NULLIF(BTRIM(provider_actor_id), '') IS NOT NULL),
  provider_actor_type           text NOT NULL CHECK (provider_actor_type IN ('captain','field')),
  policy_id                     text NOT NULL DEFAULT '',
  reason                        text NOT NULL CHECK (CHAR_LENGTH(BTRIM(reason)) >= 3),
  requested_by_actor_id         text NOT NULL CHECK (NULLIF(BTRIM(requested_by_actor_id), '') IS NOT NULL),
  requested_by_role             text NOT NULL CHECK (NULLIF(BTRIM(requested_by_role), '') IS NOT NULL),
  correlation_id                text NOT NULL DEFAULT '',
  parent_command_id             uuid REFERENCES workforce_provider_penalty_commands(id) ON DELETE RESTRICT,
  lifecycle_state               text NOT NULL CHECK (lifecycle_state IN (
    'READY','IN_FLIGHT','REMOTE_OUTCOME_UNKNOWN','REMOTE_CONFIRMED',
    'LOCAL_PROJECTION_PENDING','RECONCILING','RETRY_SCHEDULED',
    'COMPLETED','PERMANENTLY_REJECTED','HISTORIC_UNPROVEN'
  )),
  attempt_count                 integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  readback_attempt_count        integer NOT NULL DEFAULT 0 CHECK (readback_attempt_count >= 0),
  lease_token                   uuid,
  lease_owner                   text,
  lease_expires_at              timestamptz,
  next_retry_at                 timestamptz NOT NULL DEFAULT now(),
  last_attempt_at               timestamptz,
  last_readback_at              timestamptz,
  last_error_code               text NOT NULL DEFAULT '',
  last_error                    text NOT NULL DEFAULT '',
  remote_penalty_id             text NOT NULL DEFAULT '',
  remote_ledger_transaction_id  text NOT NULL DEFAULT '',
  remote_status                 text NOT NULL DEFAULT '',
  reconciliation_state          text NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (reconciliation_state IN (
    'NOT_REQUIRED','REQUIRED','FOUND','ABSENT','UNPROVEN'
  )),
  terminal_disposition          text NOT NULL DEFAULT '',
  remote_confirmed_at           timestamptz,
  completed_at                  timestamptz,
  created_at                    timestamptz NOT NULL DEFAULT now(),
  updated_at                    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_context_id, command_idempotency_key),
  UNIQUE (operator_context_id, incident_id, operation, incident_source_version),
  CHECK ((operation = 'post' AND requested_to_status = 'financial_action_posted')
      OR (operation = 'reverse' AND requested_to_status = 'reversed')),
  CHECK ((operation = 'post' AND NULLIF(BTRIM(policy_id), '') IS NOT NULL)
      OR operation = 'reverse'),
  CHECK ((lease_token IS NULL AND lease_owner IS NULL AND lease_expires_at IS NULL)
      OR (lease_token IS NOT NULL AND NULLIF(BTRIM(lease_owner), '') IS NOT NULL AND lease_expires_at IS NOT NULL)),
  CHECK (operation = 'post' OR parent_command_id IS NOT NULL OR lifecycle_state = 'HISTORIC_UNPROVEN')
);

CREATE UNIQUE INDEX workforce_provider_penalty_commands_client_idempotency_uidx
  ON workforce_provider_penalty_commands(operator_context_id, requested_by_actor_id, operation, client_idempotency_key);
CREATE INDEX workforce_provider_penalty_commands_recovery_idx
  ON workforce_provider_penalty_commands(lifecycle_state, next_retry_at, created_at)
  WHERE lifecycle_state IN ('READY','IN_FLIGHT','REMOTE_OUTCOME_UNKNOWN','REMOTE_CONFIRMED','LOCAL_PROJECTION_PENDING','RECONCILING','RETRY_SCHEDULED');
CREATE INDEX workforce_provider_penalty_commands_incident_idx
  ON workforce_provider_penalty_commands(operator_context_id, incident_id, created_at);

ALTER TABLE workforce_provider_incident_transitions
  ADD COLUMN financial_command_id uuid REFERENCES workforce_provider_penalty_commands(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX workforce_provider_incident_transitions_financial_command_uidx
  ON workforce_provider_incident_transitions(financial_command_id)
  WHERE financial_command_id IS NOT NULL;

ALTER TABLE workforce_action_audit
  ADD COLUMN financial_command_id uuid REFERENCES workforce_provider_penalty_commands(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX workforce_action_audit_financial_command_uidx
  ON workforce_action_audit(financial_command_id)
  WHERE financial_command_id IS NOT NULL;

-- Historical material rows become reconciliation commands. No financial fact
-- is invented: only WLT readback may move these commands to confirmed/completed.
INSERT INTO workforce_provider_penalty_commands(
  operator_context_id,incident_id,incident_source_version,operation,requested_to_status,
  command_idempotency_key,client_idempotency_key,request_hash,
  provider_actor_id,provider_actor_type,policy_id,reason,
  requested_by_actor_id,requested_by_role,correlation_id,lifecycle_state,
  remote_penalty_id,reconciliation_state,terminal_disposition
)
SELECT incident.operator_context_id,incident.id,incident.version,'post','financial_action_posted',
  format('workforce-provider-penalty:v1:%s:%s:%s:post',incident.operator_context_id,incident.id,incident.version),
  format('historic-post:%s:%s',incident.id,incident.version),
  format('historic:%s:%s:post',incident.id,incident.version),
  incident.actor_id,person.workforce_kind,incident.policy_id,
  COALESCE(NULLIF(BTRIM(incident.resolution_note),''),'historic provider penalty reconciliation'),
  COALESCE(NULLIF(BTRIM(incident.reviewed_by_actor_id),''),NULLIF(BTRIM(incident.reported_by_actor_id),''),'system'),
  'system_backfill','', 'RECONCILING',incident.wlt_ledger_reference,'REQUIRED','historic_reconciliation'
FROM workforce_provider_incidents incident
JOIN workforce_people person
  ON person.operator_context_id=incident.operator_context_id AND person.actor_id=incident.actor_id
WHERE person.workforce_kind IN ('captain','field')
  AND (
    incident.status IN ('financial_action_posted','reversed')
    OR NULLIF(BTRIM(incident.wlt_ledger_reference),'') IS NOT NULL
    OR (incident.status='approved' AND NULLIF(BTRIM(incident.policy_id),'') IS NOT NULL)
  );

INSERT INTO workforce_provider_penalty_commands(
  operator_context_id,incident_id,incident_source_version,operation,requested_to_status,
  command_idempotency_key,client_idempotency_key,request_hash,
  provider_actor_id,provider_actor_type,policy_id,reason,
  requested_by_actor_id,requested_by_role,correlation_id,parent_command_id,
  lifecycle_state,remote_penalty_id,reconciliation_state,terminal_disposition
)
SELECT post.operator_context_id,post.incident_id,post.incident_source_version,'reverse','reversed',
  format('workforce-provider-penalty:v1:%s:%s:%s:reverse',post.operator_context_id,post.incident_id,post.incident_source_version),
  format('historic-reverse:%s:%s',post.incident_id,post.incident_source_version),
  format('historic:%s:%s:reverse',post.incident_id,post.incident_source_version),
  post.provider_actor_id,post.provider_actor_type,post.policy_id,post.reason,
  post.requested_by_actor_id,'system_backfill','',post.id,
  'RECONCILING',post.remote_penalty_id,'REQUIRED','historic_reconciliation'
FROM workforce_provider_penalty_commands post
JOIN workforce_provider_incidents incident ON incident.id=post.incident_id
WHERE post.operation='post' AND incident.status='reversed';

CREATE OR REPLACE FUNCTION workforce_guard_financial_incident_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status
     AND EXISTS (
       SELECT 1 FROM workforce_provider_penalty_commands active
       WHERE active.operator_context_id=NEW.operator_context_id
         AND active.incident_id=NEW.id
         AND active.lifecycle_state IN (
           'READY','IN_FLIGHT','REMOTE_OUTCOME_UNKNOWN','REMOTE_CONFIRMED',
           'LOCAL_PROJECTION_PENDING','RECONCILING','RETRY_SCHEDULED'
         )
     )
     AND NOT EXISTS (
       SELECT 1 FROM workforce_provider_penalty_commands projecting
       WHERE projecting.operator_context_id=NEW.operator_context_id
         AND projecting.incident_id=NEW.id
         AND projecting.requested_to_status=NEW.status
         AND projecting.lifecycle_state='LOCAL_PROJECTION_PENDING'
     ) THEN
    RAISE EXCEPTION 'incident transition is fenced by an active financial command';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status
     AND NEW.status IN ('financial_action_posted','reversed')
     AND NOT EXISTS (
       SELECT 1
       FROM workforce_provider_penalty_commands command
       WHERE command.operator_context_id=NEW.operator_context_id
         AND command.incident_id=NEW.id
         AND command.requested_to_status=NEW.status
         AND command.lifecycle_state='LOCAL_PROJECTION_PENDING'
         AND (
           (NULLIF(BTRIM(command.remote_penalty_id),'') IS NOT NULL
            AND NULLIF(BTRIM(command.remote_ledger_transaction_id),'') IS NOT NULL)
           OR (command.operation='reverse' AND command.reconciliation_state='ABSENT')
         )
     ) THEN
    RAISE EXCEPTION 'financial incident projection requires a reconciled durable command';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_guard_financial_incident_projection ON workforce_provider_incidents;
CREATE TRIGGER trg_workforce_guard_financial_incident_projection
BEFORE UPDATE OF status ON workforce_provider_incidents
FOR EACH ROW EXECUTE FUNCTION workforce_guard_financial_incident_projection();

CREATE OR REPLACE FUNCTION workforce_validate_provider_incident_transition()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  transition_allowed boolean := true;
BEGIN
  IF OLD.status <> NEW.status THEN
    transition_allowed := CASE OLD.status
      WHEN 'reported' THEN NEW.status IN ('under_review','provider_notified','rejected')
      WHEN 'under_review' THEN NEW.status IN ('provider_notified','appeal_window','approved','rejected')
      WHEN 'provider_notified' THEN NEW.status IN ('appeal_window','approved','rejected','under_review')
      WHEN 'appeal_window' THEN NEW.status IN ('under_review','approved','rejected')
      WHEN 'approved' THEN NEW.status IN ('under_review','financial_action_posted','closed','reversed')
      WHEN 'financial_action_posted' THEN NEW.status IN ('closed','reversed')
      WHEN 'rejected' THEN NEW.status = 'closed'
      WHEN 'reversed' THEN NEW.status = 'closed'
      ELSE false
    END;
    IF NOT transition_allowed AND NEW.status='approved' AND EXISTS (
      SELECT 1 FROM workforce_provider_penalty_commands command
      WHERE command.operator_context_id=NEW.operator_context_id
        AND command.incident_id=NEW.id
        AND command.operation='post'
        AND command.lifecycle_state='HISTORIC_UNPROVEN'
        AND command.reconciliation_state='ABSENT'
    ) THEN
      transition_allowed := true;
    END IF;
    IF NOT transition_allowed THEN
      RAISE EXCEPTION 'invalid provider incident transition: % -> %', OLD.status, NEW.status;
    END IF;
  END IF;
  IF NEW.status = 'approved' AND btrim(NEW.policy_id) <> '' AND jsonb_array_length(NEW.evidence_media_refs) = 0 THEN
    RAISE EXCEPTION 'approved financial penalty requires evidence';
  END IF;
  IF NEW.status = 'financial_action_posted' AND btrim(NEW.wlt_ledger_reference) = '' THEN
    RAISE EXCEPTION 'posted financial action requires a WLT financial reference';
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON TABLE workforce_provider_penalty_commands IS
  'Durable Workforce intent/recovery authority for WLT provider-penalty POST and REVERSE commands; contains no monetary balance truth.';
