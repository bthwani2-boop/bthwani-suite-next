-- WLT-109: tenant-local COD identity, custody evidence and reconciliation.
--
-- COD records acquired tenant_id in WLT-102, while order identity, immutable
-- evidence and reconciliation remained global. This migration converges every
-- supporting authority on the COD record's trusted tenant. Immutability and
-- audit triggers are disabled only inside this transaction during backfill and
-- are restored before commit.

BEGIN;

ALTER TABLE wlt_cod_records
  DROP CONSTRAINT IF EXISTS wlt_cod_records_order_id_key;
CREATE UNIQUE INDEX wlt_cod_records_tenant_order_uq
  ON wlt_cod_records (tenant_id, order_id);

ALTER TABLE wlt_cod_custody_evidence
  ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE wlt_cod_custody_evidence
  DISABLE TRIGGER wlt_cod_custody_evidence_immutable_trigger;
UPDATE wlt_cod_custody_evidence evidence
SET tenant_id = record.tenant_id
FROM wlt_cod_records record
WHERE evidence.cod_record_id = record.id
  AND (evidence.tenant_id IS NULL OR btrim(evidence.tenant_id) = '');
UPDATE wlt_cod_custody_evidence
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_cod_custody_evidence
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_cod_custody_evidence_cod_record_id_event_type_key,
  DROP CONSTRAINT IF EXISTS wlt_cod_custody_evidence_event_type_idempotency_key_key,
  DROP CONSTRAINT IF EXISTS wlt_cod_custody_evidence_event_type_proof_reference_key;
ALTER TABLE wlt_cod_custody_evidence
  ADD CONSTRAINT wlt_cod_custody_evidence_tenant_record_event_key
    UNIQUE (tenant_id, cod_record_id, event_type),
  ADD CONSTRAINT wlt_cod_custody_evidence_tenant_idempotency_key
    UNIQUE (tenant_id, event_type, idempotency_key),
  ADD CONSTRAINT wlt_cod_custody_evidence_tenant_proof_key
    UNIQUE (tenant_id, event_type, proof_reference);
DROP INDEX IF EXISTS wlt_cod_custody_evidence_record_created_idx;
CREATE INDEX wlt_cod_custody_evidence_tenant_record_created_idx
  ON wlt_cod_custody_evidence (tenant_id, cod_record_id, created_at DESC);
ALTER TABLE wlt_cod_custody_evidence
  ENABLE TRIGGER wlt_cod_custody_evidence_immutable_trigger;

ALTER TABLE wlt_cod_reconciliation_cases
  ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE wlt_cod_reconciliation_cases
  DISABLE TRIGGER wlt_cod_reconciliation_audit_trigger;
UPDATE wlt_cod_reconciliation_cases reconciliation
SET tenant_id = record.tenant_id
FROM wlt_cod_records record
WHERE reconciliation.cod_record_id = record.id
  AND (reconciliation.tenant_id IS NULL OR btrim(reconciliation.tenant_id) = '');
UPDATE wlt_cod_reconciliation_cases
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_cod_reconciliation_cases
  ALTER COLUMN tenant_id SET NOT NULL,
  DROP CONSTRAINT IF EXISTS wlt_cod_reconciliation_cases_cod_record_id_key,
  DROP CONSTRAINT IF EXISTS wlt_cod_reconciliation_cases_custody_evidence_id_key;
ALTER TABLE wlt_cod_reconciliation_cases
  ADD CONSTRAINT wlt_cod_reconciliation_cases_tenant_record_key
    UNIQUE (tenant_id, cod_record_id),
  ADD CONSTRAINT wlt_cod_reconciliation_cases_tenant_evidence_key
    UNIQUE (tenant_id, custody_evidence_id);
DROP INDEX IF EXISTS wlt_cod_reconciliation_status_created_idx;
CREATE INDEX wlt_cod_reconciliation_tenant_status_created_idx
  ON wlt_cod_reconciliation_cases (tenant_id, status, created_at DESC);

ALTER TABLE wlt_cod_reconciliation_audit_events
  ADD COLUMN IF NOT EXISTS tenant_id text;
ALTER TABLE wlt_cod_reconciliation_audit_events
  DISABLE TRIGGER wlt_cod_reconciliation_audit_immutable_trigger;
UPDATE wlt_cod_reconciliation_audit_events audit
SET tenant_id = reconciliation.tenant_id
FROM wlt_cod_reconciliation_cases reconciliation
WHERE audit.reconciliation_case_id = reconciliation.id
  AND (audit.tenant_id IS NULL OR btrim(audit.tenant_id) = '');
UPDATE wlt_cod_reconciliation_audit_events
SET tenant_id = 'legacy-unscoped'
WHERE tenant_id IS NULL OR btrim(tenant_id) = '';
ALTER TABLE wlt_cod_reconciliation_audit_events
  ALTER COLUMN tenant_id SET NOT NULL;
DROP INDEX IF EXISTS wlt_cod_reconciliation_audit_case_created_idx;
CREATE INDEX wlt_cod_reconciliation_audit_tenant_case_created_idx
  ON wlt_cod_reconciliation_audit_events
    (tenant_id, reconciliation_case_id, created_at, id);
ALTER TABLE wlt_cod_reconciliation_audit_events
  ENABLE TRIGGER wlt_cod_reconciliation_audit_immutable_trigger;

CREATE OR REPLACE FUNCTION wlt_capture_reconciliation_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  audit_event_type text;
  audit_actor_id text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    audit_event_type := 'opened';
    audit_actor_id := NULL;
  ELSIF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    audit_event_type := 'resolved';
    audit_actor_id := NEW.resolved_by_operator_id;
  ELSIF NEW.assigned_to_operator_id IS DISTINCT FROM OLD.assigned_to_operator_id THEN
    audit_event_type := CASE WHEN OLD.assigned_to_operator_id IS NULL THEN 'assigned' ELSE 'reassigned' END;
    audit_actor_id := NEW.assigned_to_operator_id;
  ELSIF NEW.investigation_note IS DISTINCT FROM OLD.investigation_note THEN
    audit_event_type := 'investigation_updated';
    audit_actor_id := NEW.assigned_to_operator_id;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO wlt_cod_reconciliation_audit_events
    (tenant_id, reconciliation_case_id, cod_record_id, event_type,
     from_status, to_status, actor_id, metadata)
  VALUES
    (NEW.tenant_id, NEW.id, NEW.cod_record_id, audit_event_type,
     CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE OLD.status END,
     NEW.status, audit_actor_id,
     jsonb_build_object(
       'custodyEvidenceId', NEW.custody_evidence_id,
       'differenceMinorUnits', NEW.difference_minor_units,
       'currency', NEW.currency,
       'investigationNote', NEW.investigation_note,
       'resolutionAction', NEW.resolution_action,
       'resolutionNote', NEW.resolution_note
     ));
  RETURN NEW;
END
$$;

ALTER TABLE wlt_cod_reconciliation_cases
  ENABLE TRIGGER wlt_cod_reconciliation_audit_trigger;

COMMENT ON COLUMN wlt_cod_custody_evidence.tenant_id IS
  'Tenant owning immutable COD custody proof and its idempotency identity.';
COMMENT ON COLUMN wlt_cod_reconciliation_cases.tenant_id IS
  'Tenant owning the COD variance workflow.';
COMMENT ON COLUMN wlt_cod_reconciliation_audit_events.tenant_id IS
  'Tenant copied by the reconciliation audit trigger for isolated audit reads.';

COMMIT;
