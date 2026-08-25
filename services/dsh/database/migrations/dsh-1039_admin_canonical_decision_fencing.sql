-- DSH-1039: fence maker/checker decisions to the canonical mutation intent.
--
-- Once a canonical mutation intent exists, its source approval decision has
-- crossed the execution boundary and can no longer be rejected independently.
-- The source row remains pending until Identity mutation + canonical readback
-- succeed, then the fenced reconciler finalizes it to approved atomically with
-- the intent. This migration also repairs any historical rejection that raced
-- after intent creation and requeues non-applied intents for idempotent replay.

BEGIN;

CREATE TEMP TABLE dsh_1039_invalid_canonical_decisions (
  operation_type TEXT NOT NULL,
  request_id UUID NOT NULL,
  intent_status TEXT NOT NULL,
  reviewer_id TEXT,
  requested_by TEXT NOT NULL,
  PRIMARY KEY (operation_type, request_id)
) ON COMMIT DROP;

INSERT INTO dsh_1039_invalid_canonical_decisions
  (operation_type, request_id, intent_status, reviewer_id, requested_by)
SELECT
  'role-assignment', request.id, intent.status,
  NULLIF(intent.payload->>'reviewerId', ''), request.requested_by
FROM dsh_admin_approval_requests AS request
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = 'role-assignment'
 AND intent.request_id = request.id
WHERE request.status = 'rejected'
ON CONFLICT DO NOTHING;

INSERT INTO dsh_1039_invalid_canonical_decisions
  (operation_type, request_id, intent_status, reviewer_id, requested_by)
SELECT
  'role-definition-upsert', request.id, intent.status,
  NULLIF(intent.payload->>'reviewerId', ''), request.requested_by
FROM dsh_admin_role_definition_requests AS request
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = 'role-definition-upsert'
 AND intent.request_id = request.id
WHERE request.status = 'rejected'
ON CONFLICT DO NOTHING;

INSERT INTO dsh_1039_invalid_canonical_decisions
  (operation_type, request_id, intent_status, reviewer_id, requested_by)
SELECT
  'role-rollback', request.id, intent.status,
  NULLIF(intent.payload->>'reviewerId', ''), request.requested_by
FROM dsh_admin_rollback_requests AS request
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = 'role-rollback'
 AND intent.request_id = request.id
WHERE request.status = 'rejected'
ON CONFLICT DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_1039_invalid_canonical_decisions
    WHERE reviewer_id IS NULL
  ) THEN
    RAISE EXCEPTION 'cannot reconcile canonical decision without reviewerId'
      USING ERRCODE = '23514';
  END IF;
END;
$$;

-- A committed intent is the point of no return for the maker/checker decision.
-- If its source was rejected by the old race, restore the source to pending and
-- re-drive any non-applied mutation through the existing idempotent reconciler.
UPDATE dsh_admin_canonical_mutation_intents AS intent
SET status = 'pending',
    terminal_failure = FALSE,
    next_attempt_at = NOW(),
    lease_owner = NULL,
    lease_expires_at = NULL,
    last_error = NULL,
    updated_at = NOW()
FROM dsh_1039_invalid_canonical_decisions AS invalid
WHERE intent.operation_type = invalid.operation_type
  AND intent.request_id = invalid.request_id
  AND invalid.intent_status <> 'applied';

UPDATE dsh_admin_approval_requests AS request
SET status = CASE WHEN invalid.intent_status = 'applied' THEN 'approved' ELSE 'pending' END,
    reviewed_by = CASE WHEN invalid.intent_status = 'applied' THEN invalid.reviewer_id ELSE NULL END,
    review_note = CASE
      WHEN invalid.intent_status = 'applied' THEN NULLIF(intent.payload->>'reviewNote', '')
      ELSE NULL
    END,
    reviewed_at = CASE
      WHEN invalid.intent_status = 'applied' THEN intent.updated_at
      ELSE NULL
    END,
    version = request.version + 1,
    updated_at = NOW()
FROM dsh_1039_invalid_canonical_decisions AS invalid
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = invalid.operation_type
 AND intent.request_id = invalid.request_id
WHERE invalid.operation_type = 'role-assignment'
  AND request.id = invalid.request_id;

UPDATE dsh_admin_role_definition_requests AS request
SET status = CASE WHEN invalid.intent_status = 'applied' THEN 'approved' ELSE 'pending' END,
    reviewed_by = CASE WHEN invalid.intent_status = 'applied' THEN invalid.reviewer_id ELSE NULL END,
    review_note = CASE
      WHEN invalid.intent_status = 'applied' THEN NULLIF(intent.payload->>'reviewNote', '')
      ELSE NULL
    END,
    reviewed_at = CASE
      WHEN invalid.intent_status = 'applied' THEN intent.updated_at
      ELSE NULL
    END,
    version = request.version + 1,
    updated_at = NOW()
FROM dsh_1039_invalid_canonical_decisions AS invalid
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = invalid.operation_type
 AND intent.request_id = invalid.request_id
WHERE invalid.operation_type = 'role-definition-upsert'
  AND request.id = invalid.request_id;

UPDATE dsh_admin_rollback_requests AS request
SET status = CASE WHEN invalid.intent_status = 'applied' THEN 'approved' ELSE 'pending' END,
    reviewed_by = CASE WHEN invalid.intent_status = 'applied' THEN invalid.reviewer_id ELSE NULL END,
    review_note = CASE
      WHEN invalid.intent_status = 'applied' THEN NULLIF(intent.payload->>'reviewNote', '')
      ELSE NULL
    END,
    reviewed_at = CASE
      WHEN invalid.intent_status = 'applied' THEN intent.updated_at
      ELSE NULL
    END,
    version = request.version + 1,
    updated_at = NOW()
FROM dsh_1039_invalid_canonical_decisions AS invalid
JOIN dsh_admin_canonical_mutation_intents AS intent
  ON intent.operation_type = invalid.operation_type
 AND intent.request_id = invalid.request_id
WHERE invalid.operation_type = 'role-rollback'
  AND request.id = invalid.request_id;

INSERT INTO dsh_admin_audit
  (actor_id, action, target_id, detail, sensitivity, correlation_id)
SELECT
  invalid.reviewer_id,
  'CANONICAL_DECISION_RECONCILED',
  invalid.request_id::text,
  'Reconciled invalid rejection after canonical mutation intent for ' || invalid.operation_type,
  'restricted',
  invalid.operation_type || ':' || invalid.request_id::text
FROM dsh_1039_invalid_canonical_decisions AS invalid
WHERE NOT EXISTS (
  SELECT 1
  FROM dsh_admin_audit AS audit
  WHERE audit.action = 'CANONICAL_DECISION_RECONCILED'
    AND audit.correlation_id = invalid.operation_type || ':' || invalid.request_id::text
);

-- Serialize intent creation with the source decision itself. Any writer that
-- bypasses the Go service still has to observe the same canonical invariant.
CREATE OR REPLACE FUNCTION dsh_admin_guard_canonical_intent_source()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  source_status TEXT;
BEGIN
  CASE NEW.operation_type
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status
      FROM dsh_admin_approval_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status
      FROM dsh_admin_role_definition_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status
      FROM dsh_admin_rollback_requests
      WHERE id = NEW.request_id
      FOR UPDATE;
    ELSE
      RAISE EXCEPTION 'unsupported canonical mutation operation type: %', NEW.operation_type
        USING ERRCODE = '23514';
  END CASE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'canonical mutation source request does not exist: %/%', NEW.operation_type, NEW.request_id
      USING ERRCODE = '23503';
  END IF;
  IF source_status <> 'pending' THEN
    RAISE EXCEPTION 'canonical mutation source request is not pending: %/% status=%', NEW.operation_type, NEW.request_id, source_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_guard_canonical_intent_source
  ON dsh_admin_canonical_mutation_intents;
CREATE TRIGGER trg_dsh_admin_guard_canonical_intent_source
BEFORE INSERT OR UPDATE OF operation_type, request_id
ON dsh_admin_canonical_mutation_intents
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_canonical_intent_source();

CREATE OR REPLACE FUNCTION dsh_admin_guard_rejection_after_canonical_intent()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status = 'rejected' AND EXISTS (
    SELECT 1
    FROM dsh_admin_canonical_mutation_intents AS intent
    WHERE intent.operation_type = TG_ARGV[0]
      AND intent.request_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'request decision is fenced by canonical mutation intent: %/%', TG_ARGV[0], NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_approval_request_decision_fence
  ON dsh_admin_approval_requests;
CREATE TRIGGER trg_dsh_admin_approval_request_decision_fence
BEFORE UPDATE OF status
ON dsh_admin_approval_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_rejection_after_canonical_intent('role-assignment');

DROP TRIGGER IF EXISTS trg_dsh_admin_role_definition_request_decision_fence
  ON dsh_admin_role_definition_requests;
CREATE TRIGGER trg_dsh_admin_role_definition_request_decision_fence
BEFORE UPDATE OF status
ON dsh_admin_role_definition_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_rejection_after_canonical_intent('role-definition-upsert');

DROP TRIGGER IF EXISTS trg_dsh_admin_rollback_request_decision_fence
  ON dsh_admin_rollback_requests;
CREATE TRIGGER trg_dsh_admin_rollback_request_decision_fence
BEFORE UPDATE OF status
ON dsh_admin_rollback_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_rejection_after_canonical_intent('role-rollback');

COMMIT;
