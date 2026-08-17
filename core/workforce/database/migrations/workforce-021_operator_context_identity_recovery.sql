-- Workforce-021: forward recovery for databases that recorded the original
-- Workforce-020 checksum before its authoritative Identity backfill existed.
-- It is a no-op after the corrected Workforce-020 proof is present.

CREATE TABLE IF NOT EXISTS workforce_operator_context_migration_proof (
  migration_id text PRIMARY KEY,
  source_commit_sha text NOT NULL,
  source_row_count integer NOT NULL,
  source_checksum_md5 text NOT NULL,
  workforce_people_row_count bigint NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TEMP TABLE workforce_operator_context_recovery_gate ON COMMIT DROP AS
SELECT NOT EXISTS (
  SELECT 1
  FROM workforce_operator_context_migration_proof
  WHERE migration_id = 'workforce-020_operator_context_scope_boundary.sql'
) AS needs_recovery;

CREATE TABLE IF NOT EXISTS workforce_identity_operator_context_import (
  actor_id text PRIMARY KEY,
  operator_context_id text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[0-9a-f]{40}$'),
  source_row_count integer NOT NULL CHECK (source_row_count > 0),
  source_checksum_md5 text NOT NULL CHECK (source_checksum_md5 ~ '^[0-9a-f]{32}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE
  imported_rows bigint;
  declared_rows bigint;
  declared_commits integer;
  declared_checksums integer;
  calculated_checksum text;
  declared_checksum text;
  missing_actor boolean;
BEGIN
  IF NOT (SELECT needs_recovery FROM workforce_operator_context_recovery_gate) THEN
    RETURN;
  END IF;

  SELECT count(*),
         max(source_row_count),
         count(DISTINCT source_commit_sha),
         count(DISTINCT source_checksum_md5),
         md5(string_agg(actor_id || ':' || operator_context_id, E'\n' ORDER BY actor_id)),
         max(source_checksum_md5)
    INTO imported_rows, declared_rows, declared_commits, declared_checksums,
         calculated_checksum, declared_checksum
  FROM workforce_identity_operator_context_import;

  IF imported_rows = 0
     OR declared_rows IS NULL
     OR imported_rows <> declared_rows
     OR declared_commits <> 1
     OR declared_checksums <> 1
     OR calculated_checksum <> declared_checksum THEN
    RAISE EXCEPTION 'Identity operator-context recovery import is missing or its proof metadata is inconsistent';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM workforce_people person
    LEFT JOIN workforce_identity_operator_context_import imported
      ON imported.actor_id = person.actor_id
    WHERE imported.actor_id IS NULL
       OR NULLIF(BTRIM(imported.operator_context_id), '') IS NULL
  ) INTO missing_actor;
  IF missing_actor THEN
    RAISE EXCEPTION 'Identity operator-context recovery import does not cover every workforce actor';
  END IF;

  UPDATE workforce_people person
  SET operator_context_id = imported.operator_context_id
  FROM workforce_identity_operator_context_import imported
  WHERE imported.actor_id = person.actor_id;
END
$$;

UPDATE workforce_field_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_captain_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_employee_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_provider_operational_core child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_captain_activation_core child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_employee_governance child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_sovereign_leadership_assignments child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_provider_availability_notices child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_provider_incidents child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_dsh_availability_outbox outbox
SET operator_context_id = notices.operator_context_id
FROM workforce_provider_availability_notices notices
WHERE notices.id = outbox.notice_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_action_audit audit
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = COALESCE(NULLIF(audit.target_actor_id, ''), audit.actor_id)
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_idempotency idem
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = idem.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_captain_classification_history history
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = history.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_provider_incident_transitions transition
SET operator_context_id = incident.operator_context_id
FROM workforce_provider_incidents incident
WHERE incident.id = transition.incident_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);
UPDATE workforce_provisioning_cases provisioning
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = provisioning.actor_id
  AND (SELECT needs_recovery FROM workforce_operator_context_recovery_gate);

DO $$
DECLARE
  table_name text;
  has_unbound boolean;
BEGIN
  IF NOT (SELECT needs_recovery FROM workforce_operator_context_recovery_gate) THEN
    RETURN;
  END IF;
  FOREACH table_name IN ARRAY ARRAY[
    'workforce_people', 'workforce_field_profiles', 'workforce_captain_profiles',
    'workforce_employee_profiles', 'workforce_provider_operational_core',
    'workforce_captain_activation_core', 'workforce_employee_governance',
    'workforce_sovereign_leadership_assignments', 'workforce_provider_availability_notices',
    'workforce_provider_incidents', 'workforce_dsh_availability_outbox',
    'workforce_action_audit', 'workforce_idempotency',
    'workforce_captain_classification_history', 'workforce_provider_incident_transitions',
    'workforce_provisioning_cases'
  ] LOOP
    EXECUTE format(
      'SELECT EXISTS (SELECT 1 FROM %I WHERE NULLIF(BTRIM(operator_context_id), '''') IS NULL)',
      table_name
    ) INTO has_unbound;
    IF has_unbound THEN
      RAISE EXCEPTION 'operator context recovery is incomplete for %', table_name;
    END IF;
  END LOOP;
END
$$;

INSERT INTO workforce_operator_context_migration_proof(
  migration_id, source_commit_sha, source_row_count, source_checksum_md5,
  workforce_people_row_count, completed_at
)
SELECT
  'workforce-021_operator_context_identity_recovery.sql',
  max(source_commit_sha),
  max(source_row_count),
  max(source_checksum_md5),
  count(*),
  now()
FROM workforce_identity_operator_context_import
WHERE (SELECT needs_recovery FROM workforce_operator_context_recovery_gate)
HAVING count(*) > 0
ON CONFLICT (migration_id) DO UPDATE SET
  source_commit_sha = EXCLUDED.source_commit_sha,
  source_row_count = EXCLUDED.source_row_count,
  source_checksum_md5 = EXCLUDED.source_checksum_md5,
  workforce_people_row_count = EXCLUDED.workforce_people_row_count,
  completed_at = EXCLUDED.completed_at;

DROP TABLE workforce_identity_operator_context_import;
