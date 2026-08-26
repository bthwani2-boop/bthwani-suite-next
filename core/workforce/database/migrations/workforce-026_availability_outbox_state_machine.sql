-- Workforce-026: canonical Workforce -> DSH availability projection state machine.
--
-- Workforce owns the notice and its monotonically increasing source version.
-- The outbox is a durable delivery record for the latest desired projection;
-- it is not a second availability authority. A source update replaces the
-- desired payload, while the version and fencing predicates prevent an older
-- in-flight attempt from acknowledging the newer one.

BEGIN;

ALTER TABLE workforce_provider_availability_notices
  ADD COLUMN IF NOT EXISTS source_version bigint;

UPDATE workforce_provider_availability_notices
SET source_version = 1
WHERE source_version IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_provider_availability_notices
    WHERE source_version IS NULL OR source_version < 1
  ) THEN
    RAISE EXCEPTION 'workforce-026: availability notice source versions are incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM workforce_provider_availability_notices
    WHERE NULLIF(BTRIM(operator_context_id), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'workforce-026: availability notice OperatorContext ownership is incomplete';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM workforce_dsh_availability_outbox
    WHERE NULLIF(BTRIM(operator_context_id), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'workforce-026: availability outbox OperatorContext ownership is incomplete';
  END IF;
END
$$;

ALTER TABLE workforce_provider_availability_notices
  ALTER COLUMN source_version SET NOT NULL;

ALTER TABLE workforce_provider_availability_notices
  DROP CONSTRAINT IF EXISTS workforce_provider_availability_notices_source_version_check;
ALTER TABLE workforce_provider_availability_notices
  ADD CONSTRAINT workforce_provider_availability_notices_source_version_check
  CHECK (source_version > 0);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workforce_dsh_availability_outbox'
      AND column_name = 'delivery_status'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'workforce_dsh_availability_outbox'
      AND column_name = 'lifecycle_state'
  ) THEN
    ALTER TABLE workforce_dsh_availability_outbox
      RENAME COLUMN delivery_status TO lifecycle_state;
  END IF;
END
$$;

ALTER TABLE workforce_dsh_availability_outbox
  ADD COLUMN IF NOT EXISTS source_version bigint,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS readback_attempt_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_readback_at timestamptz,
  ADD COLUMN IF NOT EXISTS failure_disposition text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS terminal_disposition text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS diagnostic_code text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS reconciliation_eligible boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS remote_ack_reference text,
  ADD COLUMN IF NOT EXISTS remote_acknowledged_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

-- Reconstruct the durable event identity from canonical Workforce truth. This
-- backfill is deterministic and is rejected if any source row cannot be
-- proven, so it cannot manufacture a parallel ownership or version authority.
INSERT INTO workforce_dsh_availability_outbox (
  notice_id, operator_context_id, actor_type, actor_id, notice_type,
  starts_at, ends_at, status, reason, source_updated_at, source_version,
  idempotency_key, lifecycle_state, attempt_count, next_retry_at, last_error,
  created_at, updated_at
)
SELECT
  notice.id,
  notice.operator_context_id,
  person.workforce_kind,
  notice.actor_id,
  notice.notice_type,
  notice.starts_at,
  notice.ends_at,
  CASE WHEN notice.status = 'cancelled' THEN 'cancelled' ELSE 'active' END,
  concat_ws(':', notice.reason_code, notice.note),
  notice.updated_at,
  notice.source_version,
  format('workforce-availability-v1:%s:%s:%s', notice.operator_context_id, notice.id, notice.source_version),
  'pending',
  0,
  now(),
  '',
  notice.created_at,
  now()
FROM workforce_provider_availability_notices notice
JOIN workforce_people person ON person.actor_id = notice.actor_id
LEFT JOIN workforce_dsh_availability_outbox existing ON existing.notice_id = notice.id
WHERE person.workforce_kind IN ('captain', 'field')
  AND existing.notice_id IS NULL;

UPDATE workforce_dsh_availability_outbox outbox
SET source_version = notice.source_version,
    updated_at = now()
FROM workforce_provider_availability_notices notice
WHERE notice.id = outbox.notice_id
  AND outbox.source_version IS NULL;

UPDATE workforce_dsh_availability_outbox outbox
SET idempotency_key = format('workforce-availability-v1:%s:%s:%s', notice.operator_context_id, notice.id, notice.source_version),
    terminal_disposition = CASE WHEN outbox.lifecycle_state = 'sent' THEN 'delivered' ELSE 'none' END,
    remote_ack_reference = CASE WHEN outbox.lifecycle_state = 'sent' THEN format('workforce-availability-v1:%s:%s:%s', notice.operator_context_id, notice.id, notice.source_version) ELSE NULL END,
    remote_acknowledged_at = CASE WHEN outbox.lifecycle_state = 'sent' THEN COALESCE(outbox.updated_at, now()) ELSE NULL END,
    completed_at = CASE WHEN outbox.lifecycle_state = 'sent' THEN COALESCE(outbox.updated_at, now()) ELSE NULL END,
    updated_at = now()
FROM workforce_provider_availability_notices notice
WHERE notice.id = outbox.notice_id
  AND outbox.idempotency_key IS NULL;

-- Satisfy the new terminal-shape invariant temporarily; the following
-- post-constraint transition immediately downgrades this legacy claim to an
-- auditable unknown/reconciliation state.
UPDATE workforce_dsh_availability_outbox
SET terminal_disposition='delivered',
    remote_ack_reference=COALESCE(remote_ack_reference, idempotency_key),
    remote_acknowledged_at=COALESCE(remote_acknowledged_at, updated_at, NOW()),
    completed_at=COALESCE(completed_at, updated_at, NOW())
WHERE lifecycle_state='sent';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_provider_availability_notices notice
    JOIN workforce_people person ON person.actor_id = notice.actor_id
    LEFT JOIN workforce_dsh_availability_outbox outbox ON outbox.notice_id = notice.id
    WHERE person.workforce_kind IN ('captain', 'field')
      AND (
        outbox.notice_id IS NULL
        OR outbox.source_version IS NULL
        OR outbox.source_version <> notice.source_version
        OR outbox.operator_context_id IS DISTINCT FROM notice.operator_context_id
        OR NULLIF(BTRIM(outbox.idempotency_key), '') IS NULL
      )
  ) THEN
    RAISE EXCEPTION 'workforce-026: availability outbox backfill cannot be proven against canonical notices';
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM workforce_dsh_availability_outbox outbox
    LEFT JOIN workforce_provider_availability_notices notice
      ON notice.id = outbox.notice_id
    LEFT JOIN workforce_people person
      ON person.actor_id = outbox.actor_id
    WHERE notice.id IS NULL
       OR person.actor_id IS NULL
       OR person.workforce_kind NOT IN ('captain', 'field')
       OR outbox.operator_context_id IS DISTINCT FROM notice.operator_context_id
       OR outbox.operator_context_id IS DISTINCT FROM person.operator_context_id
       OR outbox.actor_id IS DISTINCT FROM notice.actor_id
       OR outbox.actor_type IS DISTINCT FROM person.workforce_kind
       OR outbox.notice_type IS DISTINCT FROM notice.notice_type
       OR outbox.starts_at IS DISTINCT FROM notice.starts_at
       OR outbox.ends_at IS DISTINCT FROM notice.ends_at
       OR outbox.status IS DISTINCT FROM CASE WHEN notice.status = 'cancelled' THEN 'cancelled' ELSE 'active' END
       OR outbox.reason IS DISTINCT FROM concat_ws(':', notice.reason_code, notice.note)
       OR outbox.source_updated_at IS DISTINCT FROM notice.updated_at
       OR outbox.source_version IS DISTINCT FROM notice.source_version
       OR outbox.idempotency_key IS DISTINCT FROM format(
         'workforce-availability-v1:%s:%s:%s', notice.operator_context_id, notice.id, notice.source_version
       )
  ) THEN
    RAISE EXCEPTION 'workforce-026: every availability outbox row must map to canonical notice/person identity';
  END IF;
END
$$;

ALTER TABLE workforce_dsh_availability_outbox
  ALTER COLUMN operator_context_id SET NOT NULL,
  ALTER COLUMN source_version SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL;

DO $$
DECLARE
  constraint_name text;
BEGIN
  -- The immutable 008 constraint was named from delivery_status. Drop any
  -- check whose expression governs the renamed lifecycle column before adding
  -- the complete state-machine contract.
  FOR constraint_name IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'workforce_dsh_availability_outbox'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%lifecycle_state%'
  LOOP
    EXECUTE format(
      'ALTER TABLE workforce_dsh_availability_outbox DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;
END
$$;

ALTER TABLE workforce_dsh_availability_outbox
  ADD CONSTRAINT workforce_dsh_availability_outbox_lifecycle_state_check
    CHECK (lifecycle_state IN ('pending', 'processing', 'unknown', 'sent', 'failed')),
  ADD CONSTRAINT workforce_dsh_availability_outbox_source_version_check
    CHECK (source_version > 0),
  ADD CONSTRAINT workforce_dsh_availability_outbox_idempotency_key_check
    CHECK (NULLIF(BTRIM(idempotency_key), '') IS NOT NULL),
  ADD CONSTRAINT workforce_dsh_availability_outbox_idempotency_identity_check
    CHECK (idempotency_key = format(
      'workforce-availability-v1:%s:%s:%s', operator_context_id, notice_id, source_version
    )),
  ADD CONSTRAINT workforce_dsh_availability_outbox_readback_attempt_count_check
    CHECK (readback_attempt_count >= 0),
  ADD CONSTRAINT workforce_dsh_availability_outbox_failure_disposition_check
    CHECK (failure_disposition IN (
      'none', 'retry_scheduled', 'reconciliation_required',
      'manual_retry_required', 'remote_rejected', 'invalid_operator_context'
    )),
  ADD CONSTRAINT workforce_dsh_availability_outbox_diagnostic_code_check
    CHECK (NULLIF(BTRIM(diagnostic_code), '') IS NOT NULL),
  ADD CONSTRAINT workforce_dsh_availability_outbox_processing_lease_check
    CHECK (lifecycle_state <> 'processing' OR (lease_token IS NOT NULL AND lease_expires_at IS NOT NULL)),
  ADD CONSTRAINT workforce_dsh_availability_outbox_terminal_disposition_check
    CHECK (
      (lifecycle_state IN ('pending', 'processing', 'unknown') AND terminal_disposition = 'none')
      OR (lifecycle_state = 'sent' AND terminal_disposition IN ('delivered', 'superseded'))
      OR (lifecycle_state = 'failed' AND terminal_disposition IN (
        'manual_retry_required', 'reconciliation_required', 'remote_rejected', 'invalid_operator_context'
      ))
    ),
  ADD CONSTRAINT workforce_dsh_availability_outbox_failed_disposition_check
    CHECK (lifecycle_state <> 'failed' OR failure_disposition <> 'none'),
  ADD CONSTRAINT workforce_dsh_availability_outbox_reconciliation_check
    CHECK (NOT reconciliation_eligible OR lifecycle_state IN ('unknown', 'failed'));

-- The pre-026 worker only treated HTTP 2xx as "sent" and did not persist a
-- remote acknowledgement. Reconcile those rows before declaring delivery
-- terminal; the migration must not manufacture a success disposition.
UPDATE workforce_dsh_availability_outbox
SET lifecycle_state='unknown', attempt_count=0, readback_attempt_count=0,
    next_retry_at=NOW(), last_error='legacy sent state requires remote reconciliation',
    failure_disposition='reconciliation_required', terminal_disposition='none',
    diagnostic_code='legacy_sent_requires_reconciliation', reconciliation_eligible=true,
    remote_ack_reference=NULL, remote_acknowledged_at=NULL, completed_at=NULL,
    lease_token=NULL, lease_expires_at=NULL, updated_at=NOW()
WHERE lifecycle_state='sent';

DROP INDEX IF EXISTS workforce_dsh_availability_outbox_pending_idx;

CREATE INDEX IF NOT EXISTS workforce_dsh_availability_outbox_recovery_due_idx
  ON workforce_dsh_availability_outbox(lifecycle_state, next_retry_at, created_at, id)
  WHERE lifecycle_state IN ('pending', 'unknown');

CREATE INDEX IF NOT EXISTS workforce_dsh_availability_outbox_lease_recovery_idx
  ON workforce_dsh_availability_outbox(lease_expires_at, updated_at, id)
  WHERE lifecycle_state = 'processing';

CREATE INDEX IF NOT EXISTS workforce_dsh_availability_outbox_terminal_idx
  ON workforce_dsh_availability_outbox(failure_disposition, updated_at DESC)
  WHERE lifecycle_state = 'failed';

CREATE OR REPLACE FUNCTION workforce_stamp_availability_notice_version()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.source_version := 1;
    RETURN NEW;
  END IF;

  IF NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
    RAISE EXCEPTION 'availability notice OperatorContext is immutable after creation';
  END IF;

  IF NEW.notice_type IS DISTINCT FROM OLD.notice_type
     OR NEW.starts_at IS DISTINCT FROM OLD.starts_at
     OR NEW.ends_at IS DISTINCT FROM OLD.ends_at
     OR NEW.service_zone_id IS DISTINCT FROM OLD.service_zone_id
     OR NEW.reason_code IS DISTINCT FROM OLD.reason_code
     OR NEW.note IS DISTINCT FROM OLD.note
     OR NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.source_version := OLD.source_version + 1;
    NEW.updated_at := now();
  ELSE
    NEW.source_version := OLD.source_version;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_stamp_availability_notice_version
  ON workforce_provider_availability_notices;
CREATE TRIGGER trg_workforce_stamp_availability_notice_version
BEFORE INSERT OR UPDATE ON workforce_provider_availability_notices
FOR EACH ROW EXECUTE FUNCTION workforce_stamp_availability_notice_version();

CREATE OR REPLACE FUNCTION workforce_enqueue_dsh_availability_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  provider_kind text;
  person_operator_context text;
BEGIN
  SELECT workforce_kind, operator_context_id
  INTO provider_kind, person_operator_context
  FROM workforce_people
  WHERE actor_id = NEW.actor_id;

  IF provider_kind NOT IN ('captain', 'field') THEN
    RETURN NEW;
  END IF;
  IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL
     OR person_operator_context IS DISTINCT FROM NEW.operator_context_id THEN
    RAISE EXCEPTION 'availability notice actor/OperatorContext ownership cannot be proven';
  END IF;

  INSERT INTO workforce_dsh_availability_outbox(
    notice_id, operator_context_id, actor_type, actor_id, notice_type,
    starts_at, ends_at, status, reason, source_updated_at, source_version,
    idempotency_key, lifecycle_state, attempt_count, readback_attempt_count,
    next_retry_at, last_error, failure_disposition, terminal_disposition,
    reconciliation_eligible, lease_token, lease_expires_at,
    remote_ack_reference, remote_acknowledged_at, completed_at, updated_at
  ) VALUES(
    NEW.id, NEW.operator_context_id, provider_kind, NEW.actor_id, NEW.notice_type,
    NEW.starts_at, NEW.ends_at,
    CASE WHEN NEW.status = 'cancelled' THEN 'cancelled' ELSE 'active' END,
    concat_ws(':', NEW.reason_code, NEW.note), NEW.updated_at, NEW.source_version,
    format('workforce-availability-v1:%s:%s:%s', NEW.operator_context_id, NEW.id, NEW.source_version),
    'pending', 0, 0, now(), '', 'retry_scheduled', 'none', false,
    NULL, NULL, NULL, NULL, NULL, now()
  )
  ON CONFLICT (notice_id) DO UPDATE SET
    operator_context_id = EXCLUDED.operator_context_id,
    actor_type = EXCLUDED.actor_type,
    actor_id = EXCLUDED.actor_id,
    notice_type = EXCLUDED.notice_type,
    starts_at = EXCLUDED.starts_at,
    ends_at = EXCLUDED.ends_at,
    status = EXCLUDED.status,
    reason = EXCLUDED.reason,
    source_updated_at = EXCLUDED.source_updated_at,
    source_version = EXCLUDED.source_version,
    idempotency_key = EXCLUDED.idempotency_key,
    lifecycle_state = 'pending',
    attempt_count = 0,
    readback_attempt_count = 0,
    next_retry_at = now(),
    last_error = '',
    failure_disposition = 'retry_scheduled',
    terminal_disposition = 'none',
    reconciliation_eligible = false,
    lease_token = NULL,
    lease_expires_at = NULL,
    remote_ack_reference = NULL,
    remote_acknowledged_at = NULL,
    completed_at = NULL,
    updated_at = now()
  WHERE workforce_dsh_availability_outbox.source_version < EXCLUDED.source_version;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_workforce_enqueue_dsh_availability_projection
  ON workforce_provider_availability_notices;
CREATE TRIGGER trg_workforce_enqueue_dsh_availability_projection
AFTER INSERT OR UPDATE OF notice_type, starts_at, ends_at, service_zone_id,
  status, reason_code, note, source_version
ON workforce_provider_availability_notices
FOR EACH ROW EXECUTE FUNCTION workforce_enqueue_dsh_availability_projection();

COMMIT;
