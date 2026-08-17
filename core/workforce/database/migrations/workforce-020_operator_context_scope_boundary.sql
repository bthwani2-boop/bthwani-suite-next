-- Workforce-020: make Identity-owned operator context part of every durable
-- workforce boundary. There is no default context and no legacy guess: an
-- upgrade with rows that cannot be authoritatively bound fails closed.

-- The import is populated by tools/scripts/import-identity-operator-context-to-workforce.ps1
-- from the canonical Identity database before this migration is invoked. It is
-- deliberately a migration input, not a runtime authority; it is dropped after
-- the verified cutover and only its proof metadata is retained.
CREATE TABLE IF NOT EXISTS workforce_identity_operator_context_import (
  actor_id text PRIMARY KEY,
  operator_context_id text NOT NULL CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL),
  source_commit_sha text NOT NULL CHECK (source_commit_sha ~ '^[0-9a-f]{40}$'),
  source_row_count integer NOT NULL CHECK (source_row_count > 0),
  source_checksum_md5 text NOT NULL CHECK (source_checksum_md5 ~ '^[0-9a-f]{32}$'),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workforce_operator_context_migration_proof (
  migration_id text PRIMARY KEY,
  source_commit_sha text NOT NULL,
  source_row_count integer NOT NULL,
  source_checksum_md5 text NOT NULL,
  workforce_people_row_count bigint NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workforce_people
  ADD COLUMN IF NOT EXISTS operator_context_id text;

ALTER TABLE workforce_field_profiles
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_captain_profiles
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_employee_profiles
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_provider_operational_core
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_captain_activation_core
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_employee_governance
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_sovereign_leadership_assignments
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_provider_availability_notices
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_provider_incidents
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_dsh_availability_outbox
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_action_audit
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_idempotency
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_captain_classification_history
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_provider_incident_transitions
  ADD COLUMN IF NOT EXISTS operator_context_id text;
ALTER TABLE workforce_provisioning_cases
  ADD COLUMN IF NOT EXISTS operator_context_id text;

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
  SELECT count(*),
         max(source_row_count),
         count(DISTINCT source_commit_sha),
         count(DISTINCT source_checksum_md5),
         md5(string_agg(actor_id || ':' || operator_context_id, E'\n' ORDER BY actor_id)),
         max(source_checksum_md5)
    INTO imported_rows, declared_rows, declared_commits, declared_checksums, calculated_checksum, declared_checksum
  FROM workforce_identity_operator_context_import;

  IF imported_rows = 0
     OR declared_rows IS NULL
     OR imported_rows <> declared_rows
     OR declared_commits <> 1
     OR declared_checksums <> 1
     OR calculated_checksum <> declared_checksum THEN
    RAISE EXCEPTION 'Identity operator-context import is missing or its proof metadata is inconsistent';
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
    RAISE EXCEPTION 'Identity operator-context import does not cover every workforce actor';
  END IF;

  UPDATE workforce_people person
  SET operator_context_id = imported.operator_context_id
  FROM workforce_identity_operator_context_import imported
  WHERE imported.actor_id = person.actor_id;
END
$$;

DO $$
DECLARE
  table_name text;
  has_conflict boolean;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'workforce_field_profiles', 'workforce_captain_profiles',
    'workforce_employee_profiles', 'workforce_provider_operational_core',
    'workforce_captain_activation_core', 'workforce_employee_governance',
    'workforce_sovereign_leadership_assignments', 'workforce_provider_availability_notices',
    'workforce_provider_incidents', 'workforce_captain_classification_history',
    'workforce_provisioning_cases', 'workforce_idempotency'
  ] LOOP
    EXECUTE format(
      'SELECT EXISTS (
         SELECT 1
         FROM %I child
         JOIN workforce_identity_operator_context_import imported
           ON imported.actor_id = child.actor_id
         WHERE NULLIF(BTRIM(child.operator_context_id), '''') IS NOT NULL
           AND child.operator_context_id <> imported.operator_context_id
       )',
      table_name
    ) INTO has_conflict;
    IF has_conflict THEN
      RAISE EXCEPTION 'operator context conflicts with Identity-derived context in %', table_name;
    END IF;
  END LOOP;
END
$$;

UPDATE workforce_field_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_captain_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_employee_profiles child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_provider_operational_core child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_captain_activation_core child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_employee_governance child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_sovereign_leadership_assignments child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_provider_availability_notices child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_provider_incidents child
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = child.actor_id;
UPDATE workforce_dsh_availability_outbox outbox
SET operator_context_id = notices.operator_context_id
FROM workforce_provider_availability_notices notices
WHERE notices.id = outbox.notice_id;
UPDATE workforce_action_audit audit
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = COALESCE(NULLIF(audit.target_actor_id, ''), audit.actor_id);
UPDATE workforce_idempotency idem
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = idem.actor_id;

UPDATE workforce_captain_classification_history history
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = history.actor_id;

UPDATE workforce_provider_incident_transitions transition
SET operator_context_id = incident.operator_context_id
FROM workforce_provider_incidents incident
WHERE incident.id = transition.incident_id;

UPDATE workforce_provisioning_cases provisioning
SET operator_context_id = imported.operator_context_id
FROM workforce_identity_operator_context_import imported
WHERE imported.actor_id = provisioning.actor_id;

UPDATE workforce_captain_classification_history history
SET evidence = jsonb_build_object(
      'completedDeliveries', history.completed_deliveries,
      'completionRateBasisPoints', history.completion_rate_basis_points,
      'severeIncidentFree', history.severe_incident_free,
      'evidenceMediaRefs', history.evidence_media_refs
    ),
    reason = history.decision_note,
    decided_by_actor_id = history.approved_by_actor_id
WHERE history.evidence = '{}'::jsonb;

CREATE OR REPLACE FUNCTION workforce_enqueue_dsh_availability_projection()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  provider_kind text;
BEGIN
  SELECT workforce_kind INTO provider_kind
  FROM workforce_people
  WHERE operator_context_id = NEW.operator_context_id
    AND actor_id = NEW.actor_id;
  IF provider_kind NOT IN ('captain','field') THEN
    RETURN NEW;
  END IF;
  INSERT INTO workforce_dsh_availability_outbox(
    notice_id,operator_context_id,actor_type,actor_id,notice_type,starts_at,ends_at,status,
    reason,source_updated_at,delivery_status,next_retry_at,last_error,updated_at
  ) VALUES(
    NEW.id,NULLIF(BTRIM(NEW.operator_context_id),''),provider_kind,NEW.actor_id,NEW.notice_type,NEW.starts_at,NEW.ends_at,
    CASE WHEN NEW.status='cancelled' THEN 'cancelled' ELSE 'active' END,
    concat_ws(':',NEW.reason_code,NEW.note),NEW.updated_at,'pending',now(),'',now()
  )
  ON CONFLICT(notice_id) DO UPDATE SET
    operator_context_id=EXCLUDED.operator_context_id,
    actor_type=EXCLUDED.actor_type,actor_id=EXCLUDED.actor_id,
    notice_type=EXCLUDED.notice_type,starts_at=EXCLUDED.starts_at,
    ends_at=EXCLUDED.ends_at,status=EXCLUDED.status,reason=EXCLUDED.reason,
    source_updated_at=EXCLUDED.source_updated_at,delivery_status='pending',
    next_retry_at=now(),last_error='',updated_at=now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION workforce_validate_captain_classification_decision()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.to_classification = 'basic' AND (
    NEW.from_classification <> 'joker'
    OR COALESCE((NEW.evidence->>'completedDeliveries')::integer, 0) <= 0
    OR COALESCE((NEW.evidence->>'completionRateBasisPoints')::integer, 0) <= 0
    OR COALESCE((NEW.evidence->>'severeIncidentFree')::boolean, false) = false
    OR jsonb_array_length(COALESCE(NEW.evidence->'evidenceMediaRefs', '[]'::jsonb)) = 0
  ) THEN
    RAISE EXCEPTION 'captain promotion to basic requires completed-delivery, performance, incident, and evidence facts';
  END IF;

  IF NEW.to_classification = 'basic' AND EXISTS (
    SELECT 1
    FROM workforce_provider_incidents incident
    WHERE incident.operator_context_id = NEW.operator_context_id
      AND incident.actor_id = NEW.actor_id
      AND incident.severity IN ('major','critical')
      AND incident.status NOT IN ('rejected','reversed','closed')
  ) THEN
    RAISE EXCEPTION 'captain has an unresolved major or critical incident';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION workforce_validate_captain_activation_evidence()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.classification <> NEW.classification AND NOT EXISTS (
    SELECT 1
    FROM workforce_captain_classification_history history
    WHERE history.operator_context_id = NEW.operator_context_id
      AND history.actor_id = NEW.actor_id
      AND history.from_classification = OLD.classification
      AND history.to_classification = NEW.classification
      AND history.created_at >= transaction_timestamp()
  ) THEN
    RAISE EXCEPTION 'captain classification change requires a current evidence-backed decision';
  END IF;
  RETURN NEW;
END;
$$;

ALTER TABLE workforce_captain_classification_history
  DROP COLUMN IF EXISTS completed_deliveries,
  DROP COLUMN IF EXISTS completion_rate_basis_points,
  DROP COLUMN IF EXISTS severe_incident_free,
  DROP COLUMN IF EXISTS evidence_media_refs,
  DROP COLUMN IF EXISTS decision_note,
  DROP COLUMN IF EXISTS approved_by_actor_id;

ALTER TABLE workforce_provider_incident_transitions
  DROP COLUMN IF EXISTS resolution_note,
  DROP COLUMN IF EXISTS changed_by_actor_id;

DO $$
DECLARE
  table_name text;
  has_unbound boolean;
BEGIN
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
      RAISE EXCEPTION 'operator context backfill is incomplete for %', table_name;
    END IF;
  END LOOP;
END
$$;

ALTER TABLE workforce_people ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_field_profiles ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_captain_profiles ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_employee_profiles ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_provider_operational_core ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_captain_activation_core ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_employee_governance ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_sovereign_leadership_assignments ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_provider_availability_notices ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_provider_incidents ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_dsh_availability_outbox ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_action_audit ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_idempotency ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_captain_classification_history ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_provider_incident_transitions ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE workforce_provisioning_cases ALTER COLUMN operator_context_id SET NOT NULL;

INSERT INTO workforce_operator_context_migration_proof(
  migration_id, source_commit_sha, source_row_count, source_checksum_md5,
  workforce_people_row_count, completed_at
)
SELECT
  'workforce-020_operator_context_scope_boundary.sql',
  max(source_commit_sha),
  max(source_row_count),
  max(source_checksum_md5),
  count(*),
  now()
FROM workforce_identity_operator_context_import
ON CONFLICT (migration_id) DO UPDATE SET
  source_commit_sha = EXCLUDED.source_commit_sha,
  source_row_count = EXCLUDED.source_row_count,
  source_checksum_md5 = EXCLUDED.source_checksum_md5,
  workforce_people_row_count = EXCLUDED.workforce_people_row_count,
  completed_at = EXCLUDED.completed_at;

DROP TABLE workforce_identity_operator_context_import;

CREATE UNIQUE INDEX IF NOT EXISTS workforce_people_context_actor_unique
  ON workforce_people(operator_context_id, actor_id);
CREATE INDEX IF NOT EXISTS workforce_people_context_status_idx
  ON workforce_people(operator_context_id, engagement_status, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_action_audit_context_target_idx
  ON workforce_action_audit(operator_context_id, target_actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_idempotency_context_idx
  ON workforce_idempotency(operator_context_id, actor_id, operation, idempotency_key);
CREATE INDEX IF NOT EXISTS workforce_captain_classification_history_context_idx
  ON workforce_captain_classification_history(operator_context_id, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_provider_incident_transitions_context_idx
  ON workforce_provider_incident_transitions(operator_context_id, actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS workforce_provisioning_cases_context_idx
  ON workforce_provisioning_cases(operator_context_id, created_at DESC);
