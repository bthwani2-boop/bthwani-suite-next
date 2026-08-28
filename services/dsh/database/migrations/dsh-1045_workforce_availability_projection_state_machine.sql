-- DSH-1045: ordered, idempotent Workforce availability projection boundary.
--
-- DSH owns the operational projection. Workforce owns the source notice and
-- source_version. The projection accepts a newer source version, replays the
-- exact same version idempotently, and rejects a stale or conflicting version.

BEGIN;

ALTER TABLE dsh_provider_availability_projections
  ADD COLUMN IF NOT EXISTS source_version bigint,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

UPDATE dsh_provider_availability_projections
SET source_version = 1
WHERE source_version IS NULL;

UPDATE dsh_provider_availability_projections
SET idempotency_key = format('workforce-availability-v1:%s:%s:%s', operator_context_id, notice_id, source_version)
WHERE idempotency_key IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_provider_availability_projections
    WHERE source_version IS NULL
       OR source_version < 1
       OR NULLIF(BTRIM(idempotency_key), '') IS NULL
       OR idempotency_key IS DISTINCT FROM format(
         'workforce-availability-v1:%s:%s:%s', operator_context_id, notice_id, source_version
       )
  ) THEN
    RAISE EXCEPTION 'dsh-1045: existing Workforce availability projections cannot be proven complete';
  END IF;
END
$$;

ALTER TABLE dsh_provider_availability_projections
  ALTER COLUMN source_version SET NOT NULL,
  ALTER COLUMN idempotency_key SET NOT NULL;

ALTER TABLE dsh_provider_availability_projections
  ADD CONSTRAINT dsh_provider_availability_projections_source_version_check
    CHECK (source_version > 0),
  ADD CONSTRAINT dsh_provider_availability_projections_idempotency_key_check
    CHECK (NULLIF(BTRIM(idempotency_key), '') IS NOT NULL),
  ADD CONSTRAINT dsh_provider_availability_projections_idempotency_identity_check
    CHECK (idempotency_key = format(
      'workforce-availability-v1:%s:%s:%s', operator_context_id, notice_id, source_version
    ));

CREATE UNIQUE INDEX IF NOT EXISTS dsh_provider_availability_projections_idempotency_idx
  ON dsh_provider_availability_projections(operator_context_id, idempotency_key);

COMMENT ON COLUMN dsh_provider_availability_projections.source_version IS
  'Monotonic version issued by the Workforce availability notice; the only ordering authority.';
COMMENT ON COLUMN dsh_provider_availability_projections.idempotency_key IS
  'Deterministic Workforce delivery identity for OperatorContext + notice + source_version.';

COMMIT;
