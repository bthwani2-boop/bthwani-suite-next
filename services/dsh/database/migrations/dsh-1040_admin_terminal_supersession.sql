-- DSH-1040: terminal canonical mutation supersession.
--
-- A failed terminal execution is immutable. Operators may recover only by
-- atomically superseding its maker/checker source and creating a fresh pending
-- request. The replacement points to the old request; the old execution and
-- decision payloads are never reset or replayed.

BEGIN;

DO $$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM dsh_admin_canonical_mutation_intents
  WHERE status NOT IN ('pending', 'failed', 'applied')
     OR (terminal_failure AND status <> 'failed');

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'dsh-1040 cannot normalize % invalid canonical mutation intent states', invalid_count
      USING ERRCODE = '23514';
  END IF;

  SELECT count(*)
  INTO invalid_count
  FROM (
    SELECT
      intent.status,
      CASE intent.operation_type
        WHEN 'role-assignment' THEN (
          SELECT request.status
          FROM dsh_admin_approval_requests AS request
          WHERE request.id = intent.request_id
        )
        WHEN 'role-definition-upsert' THEN (
          SELECT request.status
          FROM dsh_admin_role_definition_requests AS request
          WHERE request.id = intent.request_id
        )
        WHEN 'role-rollback' THEN (
          SELECT request.status
          FROM dsh_admin_rollback_requests AS request
          WHERE request.id = intent.request_id
        )
        ELSE NULL
      END AS source_status
    FROM dsh_admin_canonical_mutation_intents AS intent
  ) AS state
  WHERE state.source_status IS NULL
     OR (state.status = 'applied' AND state.source_status <> 'approved')
     OR (state.status <> 'applied' AND state.source_status <> 'pending');

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'dsh-1040 found % canonical intent/source decision mismatches; reconcile before migration', invalid_count
      USING ERRCODE = '23514';
  END IF;
END;
$$;

DROP INDEX IF EXISTS idx_dsh_admin_mutation_intents_retry;
DROP INDEX IF EXISTS idx_dsh_admin_mutation_intents_lease_expiry;
DROP INDEX IF EXISTS idx_dsh_admin_mutation_intents_lease_generation;

ALTER TABLE dsh_admin_canonical_mutation_intents
  DROP CONSTRAINT IF EXISTS dsh_admin_canonical_mutation_intents_status_check;

UPDATE dsh_admin_canonical_mutation_intents
SET status = CASE
  WHEN status = 'applied' THEN 'applied'
  WHEN terminal_failure THEN 'failed_terminal'
  WHEN status = 'failed' THEN 'retryable_failure'
  ELSE 'pending'
END;

ALTER TABLE dsh_admin_canonical_mutation_intents
  DROP COLUMN terminal_failure;

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_status_check
  CHECK (status IN ('pending', 'retryable_failure', 'failed_terminal', 'applied'));

ALTER TABLE dsh_admin_canonical_mutation_intents
  ADD CONSTRAINT dsh_admin_canonical_mutation_intents_terminal_state_check
  CHECK (
    (status IN ('pending', 'retryable_failure') AND next_attempt_at IS NOT NULL)
    OR
    (status IN ('failed_terminal', 'applied')
      AND next_attempt_at IS NULL
      AND lease_owner IS NULL
      AND lease_expires_at IS NULL)
  );

CREATE INDEX idx_dsh_admin_mutation_intents_retry
  ON dsh_admin_canonical_mutation_intents (next_attempt_at, created_at)
  WHERE status IN ('pending', 'retryable_failure');

CREATE INDEX idx_dsh_admin_mutation_intents_lease_expiry
  ON dsh_admin_canonical_mutation_intents (lease_expires_at)
  WHERE status IN ('pending', 'retryable_failure');

CREATE INDEX idx_dsh_admin_mutation_intents_lease_generation
  ON dsh_admin_canonical_mutation_intents (lease_generation)
  WHERE status IN ('pending', 'retryable_failure');

ALTER TABLE dsh_admin_audit
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE dsh_admin_audit
  DROP CONSTRAINT IF EXISTS dsh_admin_audit_metadata_object_check;
ALTER TABLE dsh_admin_audit
  ADD CONSTRAINT dsh_admin_audit_metadata_object_check
  CHECK (jsonb_typeof(metadata) = 'object');

-- Historical lifecycle details contained prose assembled from actor IDs, role
-- names, reasons, and review notes. Replace it in place with the same strict
-- privacy-safe JSON vocabulary written by the current runtime. Raw values are
-- never copied into the replacement representation.
SELECT set_config('bthwani.audit_maintenance', 'on', TRUE);

UPDATE dsh_admin_audit AS audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', request.id::text,
  'decision', CASE audit.action
    WHEN 'ROLE_ASSIGNMENT_APPROVED' THEN 'approved'
    WHEN 'ROLE_ASSIGNMENT_REJECTED' THEN 'rejected'
    ELSE NULL
  END,
  'action_type', request.action_type,
  'reason_provided', CASE WHEN audit.action = 'ROLE_ASSIGNMENT_REQUESTED' THEN btrim(request.reason) <> '' ELSE NULL END,
  'note_provided', CASE WHEN audit.action IN ('ROLE_ASSIGNMENT_APPROVED', 'ROLE_ASSIGNMENT_REJECTED')
    THEN btrim(COALESCE(request.review_note, '')) <> '' ELSE NULL END
))::text
FROM dsh_admin_approval_requests AS request
WHERE audit.action IN ('ROLE_ASSIGNMENT_REQUESTED', 'ROLE_ASSIGNMENT_APPROVED', 'ROLE_ASSIGNMENT_REJECTED')
  AND audit.target_id = request.id::text;

UPDATE dsh_admin_audit AS audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', request.id::text,
  'decision', CASE audit.action
    WHEN 'ROLE_DEFINITION_APPROVED' THEN 'approved'
    WHEN 'ROLE_DEFINITION_REJECTED' THEN 'rejected'
    ELSE NULL
  END,
  'reason_provided', CASE WHEN audit.action = 'ROLE_DEFINITION_REQUESTED' THEN btrim(request.reason) <> '' ELSE NULL END,
  'note_provided', CASE WHEN audit.action IN ('ROLE_DEFINITION_APPROVED', 'ROLE_DEFINITION_REJECTED')
    THEN btrim(COALESCE(request.review_note, '')) <> '' ELSE NULL END,
  'permission_count', jsonb_array_length(request.permissions),
  'surface_count', jsonb_array_length(request.surfaces)
))::text
FROM dsh_admin_role_definition_requests AS request
WHERE audit.action IN ('ROLE_DEFINITION_REQUESTED', 'ROLE_DEFINITION_APPROVED', 'ROLE_DEFINITION_REJECTED')
  AND audit.target_id = request.id::text;

UPDATE dsh_admin_audit AS audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', request.id::text,
  'decision', CASE audit.action
    WHEN 'ROLLBACK_APPROVED' THEN 'approved'
    WHEN 'ROLLBACK_REJECTED' THEN 'rejected'
    ELSE NULL
  END,
  'action_type', request.inverse_action_type,
  'reason_provided', CASE WHEN audit.action = 'ROLLBACK_REQUESTED' THEN btrim(request.reason) <> '' ELSE NULL END,
  'note_provided', CASE WHEN audit.action IN ('ROLLBACK_APPROVED', 'ROLLBACK_REJECTED')
    THEN btrim(COALESCE(request.review_note, '')) <> '' ELSE NULL END
))::text
FROM dsh_admin_rollback_requests AS request
WHERE audit.action IN ('ROLLBACK_REQUESTED', 'ROLLBACK_APPROVED', 'ROLLBACK_REJECTED')
  AND audit.target_id = request.id::text;

UPDATE dsh_admin_audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', target_id,
  'decision', 'reconciled',
  'action_type', CASE split_part(COALESCE(correlation_id, ''), ':', 1)
    WHEN 'role-assignment' THEN 'role-assignment'
    WHEN 'role-definition-upsert' THEN 'role-definition-upsert'
    WHEN 'role-rollback' THEN 'role-rollback'
    ELSE NULL
  END
))::text
WHERE action = 'CANONICAL_DECISION_RECONCILED';

UPDATE dsh_admin_audit AS audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', request.id::text,
  'reason_provided', CASE WHEN audit.action IN ('support_session_requested', 'support_session_revoked')
    THEN TRUE ELSE NULL END,
  'note_provided', CASE WHEN audit.action IN ('support_session_approved', 'support_session_rejected')
    THEN btrim(COALESCE(request.review_note, '')) <> '' ELSE NULL END
))::text
FROM dsh_admin_support_session_requests AS request
WHERE audit.action IN (
  'support_session_requested', 'support_session_approved', 'support_session_rejected',
  'support_session_issued', 'support_session_revoked', 'partner_support_access'
)
  AND audit.correlation_id = request.id::text;

UPDATE dsh_admin_audit
SET detail = jsonb_strip_nulls(jsonb_build_object(
  'request_id', NULLIF(btrim(COALESCE(correlation_id, '')), ''),
  'reason_provided', CASE WHEN action IN ('support_session_requested', 'support_session_revoked')
    THEN TRUE ELSE NULL END
))::text
WHERE action IN (
  'support_session_requested', 'support_session_approved', 'support_session_rejected',
  'support_session_issued', 'support_session_revoked', 'partner_support_access'
)
  AND NOT EXISTS (
    SELECT 1
    FROM dsh_admin_support_session_requests AS request
    WHERE request.id::text = dsh_admin_audit.correlation_id
  );

UPDATE dsh_admin_audit
SET detail = '{}'::jsonb::text
WHERE action IN ('ROLE_ASSIGNMENT_REQUESTED', 'ROLE_ASSIGNMENT_APPROVED', 'ROLE_ASSIGNMENT_REJECTED')
  AND NOT EXISTS (
    SELECT 1 FROM dsh_admin_approval_requests AS request WHERE request.id::text = dsh_admin_audit.target_id
  );

UPDATE dsh_admin_audit
SET detail = '{}'::jsonb::text
WHERE action IN ('ROLE_DEFINITION_REQUESTED', 'ROLE_DEFINITION_APPROVED', 'ROLE_DEFINITION_REJECTED')
  AND NOT EXISTS (
    SELECT 1 FROM dsh_admin_role_definition_requests AS request WHERE request.id::text = dsh_admin_audit.target_id
  );

UPDATE dsh_admin_audit
SET detail = '{}'::jsonb::text
WHERE action IN ('ROLLBACK_REQUESTED', 'ROLLBACK_APPROVED', 'ROLLBACK_REJECTED')
  AND NOT EXISTS (
    SELECT 1 FROM dsh_admin_rollback_requests AS request WHERE request.id::text = dsh_admin_audit.target_id
  );

SELECT set_config('bthwani.audit_maintenance', 'off', TRUE);

DO $$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT count(*)
  INTO invalid_count
  FROM dsh_admin_audit AS audit
  WHERE audit.action IN (
    'ROLE_ASSIGNMENT_REQUESTED', 'ROLE_ASSIGNMENT_APPROVED', 'ROLE_ASSIGNMENT_REJECTED',
    'ROLE_DEFINITION_REQUESTED', 'ROLE_DEFINITION_APPROVED', 'ROLE_DEFINITION_REJECTED',
    'ROLLBACK_REQUESTED', 'ROLLBACK_APPROVED', 'ROLLBACK_REJECTED',
    'CANONICAL_DECISION_RECONCILED',
    'support_session_requested', 'support_session_approved', 'support_session_rejected',
    'support_session_issued', 'support_session_revoked', 'partner_support_access'
  )
    AND (
      jsonb_typeof(audit.detail::jsonb) <> 'object'
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(audit.detail::jsonb) AS detail_key(key)
        WHERE detail_key.key NOT IN (
          'request_id', 'decision', 'action_type', 'reason_provided',
          'note_provided', 'permission_count', 'surface_count'
        )
      )
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'dsh-1040 audit privacy reconciliation left % invalid lifecycle details', invalid_count
      USING ERRCODE = '23514';
  END IF;
END;
$$;

ALTER TABLE dsh_admin_approval_requests
  ADD COLUMN IF NOT EXISTS expected_role_version INTEGER,
  ADD COLUMN IF NOT EXISTS supersedes_request_id UUID,
  ADD COLUMN IF NOT EXISTS superseded_by TEXT,
  ADD COLUMN IF NOT EXISTS superseded_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

ALTER TABLE dsh_admin_role_definition_requests
  ADD COLUMN IF NOT EXISTS supersedes_request_id UUID,
  ADD COLUMN IF NOT EXISTS superseded_by TEXT,
  ADD COLUMN IF NOT EXISTS superseded_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

ALTER TABLE dsh_admin_rollback_requests
  ADD COLUMN IF NOT EXISTS expected_role_version INTEGER,
  ADD COLUMN IF NOT EXISTS supersedes_request_id UUID,
  ADD COLUMN IF NOT EXISTS superseded_by TEXT,
  ADD COLUMN IF NOT EXISTS superseded_reason_code TEXT,
  ADD COLUMN IF NOT EXISTS superseded_at TIMESTAMPTZ;

DO $$
DECLARE
  table_name TEXT;
  expected_status_constraint TEXT;
  new_lifecycle_constraint TEXT;
  constraint_name TEXT;
  constraint_count INTEGER;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'dsh_admin_approval_requests',
    'dsh_admin_role_definition_requests',
    'dsh_admin_rollback_requests'
  ] LOOP
    expected_status_constraint := table_name || '_status_check';
    new_lifecycle_constraint := table_name || '_supersession_lifecycle_check';

    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', table_name, expected_status_constraint);

    SELECT count(*), min(constraint_row.conname)
    INTO constraint_count, constraint_name
    FROM (
      SELECT constraint_def.conname
      FROM pg_constraint AS constraint_def
      WHERE constraint_def.conrelid = table_name::regclass
        AND constraint_def.contype = 'c'
        AND pg_get_constraintdef(constraint_def.oid) ILIKE '%reviewed_by%'
        AND pg_get_constraintdef(constraint_def.oid) ILIKE '%reviewed_at%'
        AND pg_get_constraintdef(constraint_def.oid) ILIKE '%status%pending%'
        AND constraint_def.conname <> new_lifecycle_constraint
    ) AS constraint_row;

    IF constraint_count <> 1 THEN
      RAISE EXCEPTION 'dsh-1040 expected one legacy lifecycle constraint on %, found %', table_name, constraint_count
        USING ERRCODE = '23514';
    END IF;
    EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', table_name, constraint_name);
  END LOOP;
END;
$$;

ALTER TABLE dsh_admin_approval_requests
  ADD CONSTRAINT dsh_admin_approval_requests_expected_role_version_check
    CHECK (expected_role_version IS NULL OR expected_role_version > 0),
  ADD CONSTRAINT dsh_admin_approval_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  ADD CONSTRAINT dsh_admin_approval_requests_supersession_lifecycle_check
  CHECK (
    (status = 'pending'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status IN ('approved', 'rejected')
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status = 'superseded'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NOT NULL
      AND superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'
      AND superseded_at IS NOT NULL)
  ),
  ADD CONSTRAINT dsh_admin_approval_requests_supersedes_fkey
    FOREIGN KEY (supersedes_request_id) REFERENCES dsh_admin_approval_requests(id) ON DELETE RESTRICT,
  ADD CONSTRAINT dsh_admin_approval_requests_supersedes_not_self_check
    CHECK (supersedes_request_id IS NULL OR supersedes_request_id <> id),
  ADD CONSTRAINT dsh_admin_approval_requests_supersedes_unique UNIQUE (supersedes_request_id);

ALTER TABLE dsh_admin_role_definition_requests
  ADD CONSTRAINT dsh_admin_role_definition_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  ADD CONSTRAINT dsh_admin_role_definition_requests_supersession_lifecycle_check
  CHECK (
    (status = 'pending'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status IN ('approved', 'rejected')
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status = 'superseded'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NOT NULL
      AND superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'
      AND superseded_at IS NOT NULL)
  ),
  ADD CONSTRAINT dsh_admin_role_definition_requests_supersedes_fkey
    FOREIGN KEY (supersedes_request_id) REFERENCES dsh_admin_role_definition_requests(id) ON DELETE RESTRICT,
  ADD CONSTRAINT dsh_admin_role_definition_requests_supersedes_not_self_check
    CHECK (supersedes_request_id IS NULL OR supersedes_request_id <> id),
  ADD CONSTRAINT dsh_admin_role_definition_requests_supersedes_unique UNIQUE (supersedes_request_id);

ALTER TABLE dsh_admin_rollback_requests
  ADD CONSTRAINT dsh_admin_rollback_requests_expected_role_version_check
    CHECK (expected_role_version IS NULL OR expected_role_version > 0),
  ADD CONSTRAINT dsh_admin_rollback_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  ADD CONSTRAINT dsh_admin_rollback_requests_supersession_lifecycle_check
  CHECK (
    (status = 'pending'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status IN ('approved', 'rejected')
      AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL
      AND superseded_by IS NULL AND superseded_reason_code IS NULL AND superseded_at IS NULL)
    OR
    (status = 'superseded'
      AND reviewed_by IS NULL AND reviewed_at IS NULL
      AND superseded_by IS NOT NULL
      AND superseded_reason_code ~ '^[a-z][a-z0-9_]{2,63}$'
      AND superseded_at IS NOT NULL)
  ),
  ADD CONSTRAINT dsh_admin_rollback_requests_supersedes_fkey
    FOREIGN KEY (supersedes_request_id) REFERENCES dsh_admin_rollback_requests(id) ON DELETE RESTRICT,
  ADD CONSTRAINT dsh_admin_rollback_requests_supersedes_not_self_check
    CHECK (supersedes_request_id IS NULL OR supersedes_request_id <> id),
  ADD CONSTRAINT dsh_admin_rollback_requests_supersedes_unique UNIQUE (supersedes_request_id);

CREATE OR REPLACE FUNCTION dsh_admin_guard_terminal_intent_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'canonical mutation intents are immutable ledger records'
      USING ERRCODE = '23514';
  END IF;
  IF NEW.operation_type IS DISTINCT FROM OLD.operation_type
     OR NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.payload IS DISTINCT FROM OLD.payload THEN
    RAISE EXCEPTION 'canonical mutation intent identity and payload are immutable'
      USING ERRCODE = '23514';
  END IF;
  IF OLD.status IN ('failed_terminal', 'applied') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'terminal canonical mutation intent cannot be replayed or reset: %/%', OLD.operation_type, OLD.request_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_terminal_intent_immutability
  ON dsh_admin_canonical_mutation_intents;
CREATE TRIGGER trg_dsh_admin_terminal_intent_immutability
BEFORE UPDATE OR DELETE ON dsh_admin_canonical_mutation_intents
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_terminal_intent_immutability();

CREATE OR REPLACE FUNCTION dsh_admin_guard_source_supersession()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  terminal_status TEXT;
BEGIN
  IF OLD.status = 'superseded' THEN
    RAISE EXCEPTION 'superseded administration request is immutable: %/%', TG_ARGV[0], OLD.id
      USING ERRCODE = '23514';
  END IF;

  SELECT intent.status
  INTO terminal_status
  FROM dsh_admin_canonical_mutation_intents AS intent
  WHERE intent.operation_type = TG_ARGV[0]
    AND intent.request_id = OLD.id
  FOR UPDATE;

  IF terminal_status = 'failed_terminal' THEN
    IF NEW.status <> 'superseded' THEN
      RAISE EXCEPTION 'failed terminal administration request must be superseded, not modified: %/%', TG_ARGV[0], OLD.id
        USING ERRCODE = '23514';
    END IF;
    IF OLD.status <> 'pending'
       OR (to_jsonb(NEW) - ARRAY['status','superseded_by','superseded_reason_code','superseded_at','version','updated_at'])
          IS DISTINCT FROM
          (to_jsonb(OLD) - ARRAY['status','superseded_by','superseded_reason_code','superseded_at','version','updated_at'])
       OR NEW.version <> OLD.version + 1 THEN
      RAISE EXCEPTION 'failed terminal administration request payload or decision cannot change during supersession: %/%', TG_ARGV[0], OLD.id
        USING ERRCODE = '23514';
    END IF;
  ELSIF NEW.status = 'superseded' THEN
    RAISE EXCEPTION 'only a failed terminal administration request can be superseded: %/%', TG_ARGV[0], OLD.id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_approval_request_supersession
  ON dsh_admin_approval_requests;
CREATE TRIGGER trg_dsh_admin_approval_request_supersession
BEFORE UPDATE ON dsh_admin_approval_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_source_supersession('role-assignment');

DROP TRIGGER IF EXISTS trg_dsh_admin_role_definition_request_supersession
  ON dsh_admin_role_definition_requests;
CREATE TRIGGER trg_dsh_admin_role_definition_request_supersession
BEFORE UPDATE ON dsh_admin_role_definition_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_source_supersession('role-definition-upsert');

DROP TRIGGER IF EXISTS trg_dsh_admin_rollback_request_supersession
  ON dsh_admin_rollback_requests;
CREATE TRIGGER trg_dsh_admin_rollback_request_supersession
BEFORE UPDATE ON dsh_admin_rollback_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_source_supersession('role-rollback');

CREATE OR REPLACE FUNCTION dsh_admin_guard_replacement_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  source_status TEXT;
  intent_status TEXT;
BEGIN
  IF NEW.supersedes_request_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.status <> 'pending' OR NEW.reviewed_by IS NOT NULL OR NEW.reviewed_at IS NOT NULL THEN
    RAISE EXCEPTION 'replacement administration request must start a fresh maker/checker decision'
      USING ERRCODE = '23514';
  END IF;
  IF TG_ARGV[0] IN ('role-assignment', 'role-rollback')
     AND NULLIF(to_jsonb(NEW)->>'expected_role_version', '') IS NULL THEN
    RAISE EXCEPTION 'replacement role mutation must be fenced to the current canonical role version'
      USING ERRCODE = '23514';
  END IF;

  CASE TG_ARGV[0]
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status FROM dsh_admin_approval_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status FROM dsh_admin_role_definition_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status FROM dsh_admin_rollback_requests WHERE id = NEW.supersedes_request_id FOR UPDATE;
    ELSE
      RAISE EXCEPTION 'unsupported administration replacement operation: %', TG_ARGV[0]
        USING ERRCODE = '23514';
  END CASE;

  SELECT status INTO intent_status
  FROM dsh_admin_canonical_mutation_intents
  WHERE operation_type = TG_ARGV[0]
    AND request_id = NEW.supersedes_request_id
  FOR UPDATE;

  IF source_status IS DISTINCT FROM 'superseded' OR intent_status IS DISTINCT FROM 'failed_terminal' THEN
    RAISE EXCEPTION 'replacement must reference a superseded failed terminal request: %/%', TG_ARGV[0], NEW.supersedes_request_id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_approval_replacement_link
  ON dsh_admin_approval_requests;
CREATE TRIGGER trg_dsh_admin_approval_replacement_link
BEFORE INSERT OR UPDATE OF supersedes_request_id ON dsh_admin_approval_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_replacement_link('role-assignment');

DROP TRIGGER IF EXISTS trg_dsh_admin_role_definition_replacement_link
  ON dsh_admin_role_definition_requests;
CREATE TRIGGER trg_dsh_admin_role_definition_replacement_link
BEFORE INSERT OR UPDATE OF supersedes_request_id ON dsh_admin_role_definition_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_replacement_link('role-definition-upsert');

DROP TRIGGER IF EXISTS trg_dsh_admin_rollback_replacement_link
  ON dsh_admin_rollback_requests;
CREATE TRIGGER trg_dsh_admin_rollback_replacement_link
BEFORE INSERT OR UPDATE OF supersedes_request_id ON dsh_admin_rollback_requests
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_guard_replacement_link('role-rollback');

CREATE OR REPLACE FUNCTION dsh_admin_assert_intent_source_decision()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  operation_type_value TEXT;
  request_id_value UUID;
  intent_status TEXT;
  source_status TEXT;
  replacement_count BIGINT;
BEGIN
  IF TG_TABLE_NAME = 'dsh_admin_canonical_mutation_intents' THEN
    operation_type_value := COALESCE(NEW.operation_type, OLD.operation_type);
    request_id_value := COALESCE(NEW.request_id, OLD.request_id);
  ELSE
    operation_type_value := TG_ARGV[0];
    request_id_value := COALESCE(NEW.id, OLD.id);
  END IF;

  SELECT status INTO intent_status
  FROM dsh_admin_canonical_mutation_intents
  WHERE operation_type = operation_type_value AND request_id = request_id_value;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  CASE operation_type_value
    WHEN 'role-assignment' THEN
      SELECT status INTO source_status FROM dsh_admin_approval_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_approval_requests WHERE supersedes_request_id = request_id_value;
    WHEN 'role-definition-upsert' THEN
      SELECT status INTO source_status FROM dsh_admin_role_definition_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_role_definition_requests WHERE supersedes_request_id = request_id_value;
    WHEN 'role-rollback' THEN
      SELECT status INTO source_status FROM dsh_admin_rollback_requests WHERE id = request_id_value;
      SELECT count(*) INTO replacement_count FROM dsh_admin_rollback_requests WHERE supersedes_request_id = request_id_value;
    ELSE
      source_status := NULL;
      replacement_count := 0;
  END CASE;

  IF source_status IS NULL
     OR (intent_status = 'applied' AND source_status <> 'approved')
     OR (source_status = 'approved' AND intent_status <> 'applied')
     OR (source_status = 'superseded' AND intent_status <> 'failed_terminal')
     OR (source_status = 'superseded' AND replacement_count <> 1)
     OR (source_status <> 'superseded' AND replacement_count <> 0)
     OR (intent_status IN ('pending', 'retryable_failure') AND source_status <> 'pending')
     OR (intent_status = 'failed_terminal' AND source_status NOT IN ('pending', 'superseded')) THEN
    RAISE EXCEPTION 'canonical intent/source invariant violation: %/% intent=% source=%', operation_type_value, request_id_value, intent_status, source_status
      USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_admin_intent_source_decision_invariant
  ON dsh_admin_canonical_mutation_intents;
CREATE CONSTRAINT TRIGGER trg_dsh_admin_intent_source_decision_invariant
AFTER INSERT OR UPDATE OR DELETE ON dsh_admin_canonical_mutation_intents
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_assert_intent_source_decision();

DROP TRIGGER IF EXISTS trg_dsh_admin_approval_source_decision_invariant
  ON dsh_admin_approval_requests;
CREATE CONSTRAINT TRIGGER trg_dsh_admin_approval_source_decision_invariant
AFTER INSERT OR UPDATE OR DELETE ON dsh_admin_approval_requests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_assert_intent_source_decision('role-assignment');

DROP TRIGGER IF EXISTS trg_dsh_admin_role_definition_source_decision_invariant
  ON dsh_admin_role_definition_requests;
CREATE CONSTRAINT TRIGGER trg_dsh_admin_role_definition_source_decision_invariant
AFTER INSERT OR UPDATE OR DELETE ON dsh_admin_role_definition_requests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_assert_intent_source_decision('role-definition-upsert');

DROP TRIGGER IF EXISTS trg_dsh_admin_rollback_source_decision_invariant
  ON dsh_admin_rollback_requests;
CREATE CONSTRAINT TRIGGER trg_dsh_admin_rollback_source_decision_invariant
AFTER INSERT OR UPDATE OR DELETE ON dsh_admin_rollback_requests
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION dsh_admin_assert_intent_source_decision('role-rollback');

COMMIT;
