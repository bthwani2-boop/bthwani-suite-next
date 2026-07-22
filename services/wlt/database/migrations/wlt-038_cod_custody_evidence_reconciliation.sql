-- JRN-038: COD cash custody, evidence, variance and reconciliation truth.
--
-- WLT remains the financial source of truth. A collection/remittance state
-- transition is not considered complete unless the corresponding evidence and
-- double-entry ledger transaction commit in the same database transaction.

ALTER TABLE wlt_ledger_accounts
  DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_type_chk;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_type_chk CHECK (
    account_type IN (
      'wallet',
      'platform_revenue',
      'platform_payable',
      'provider_clearing',
      'cash_in_transit',
      'cash_variance',
      'platform_commission_receivable'
    )
  );

COMMENT ON CONSTRAINT wlt_ledger_accounts_type_chk ON wlt_ledger_accounts IS
  'Closed WLT chart subset including COD cash in transit and explicit expected-versus-actual variance.';

CREATE TABLE IF NOT EXISTS wlt_cod_custody_evidence (
  id                           text PRIMARY KEY DEFAULT ('wcde_' || gen_random_uuid()::text),
  cod_record_id                text NOT NULL REFERENCES wlt_cod_records(id) ON DELETE RESTRICT,
  event_type                   text NOT NULL,
  expected_amount_minor_units  bigint NOT NULL CHECK (expected_amount_minor_units >= 0),
  actual_amount_minor_units    bigint NOT NULL CHECK (actual_amount_minor_units >= 0),
  difference_minor_units       bigint NOT NULL,
  currency                     text NOT NULL,
  proof_reference              text NOT NULL,
  actor_id                     text NOT NULL,
  actor_type                   text NOT NULL,
  note                         text NOT NULL DEFAULT '',
  correlation_id               text NOT NULL,
  idempotency_key              text NOT NULL,
  ledger_transaction_id        text NOT NULL,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_cod_custody_evidence_event_chk
    CHECK (event_type IN ('collection', 'remittance')),
  CONSTRAINT wlt_cod_custody_evidence_actor_chk
    CHECK (actor_type IN ('captain', 'store_courier', 'partner_store', 'partner', 'operator')),
  CONSTRAINT wlt_cod_custody_evidence_proof_chk
    CHECK (length(btrim(proof_reference)) >= 3),
  CONSTRAINT wlt_cod_custody_evidence_correlation_chk
    CHECK (length(btrim(correlation_id)) >= 3),
  CONSTRAINT wlt_cod_custody_evidence_idempotency_chk
    CHECK (length(btrim(idempotency_key)) >= 3),
  CONSTRAINT wlt_cod_custody_evidence_difference_chk
    CHECK (difference_minor_units = actual_amount_minor_units - expected_amount_minor_units),
  UNIQUE (cod_record_id, event_type),
  UNIQUE (event_type, idempotency_key),
  UNIQUE (event_type, proof_reference)
);

CREATE INDEX IF NOT EXISTS wlt_cod_custody_evidence_record_created_idx
  ON wlt_cod_custody_evidence(cod_record_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_cod_reconciliation_cases (
  id                           text PRIMARY KEY DEFAULT ('wcrc_' || gen_random_uuid()::text),
  cod_record_id                text NOT NULL REFERENCES wlt_cod_records(id) ON DELETE RESTRICT,
  custody_evidence_id          text NOT NULL REFERENCES wlt_cod_custody_evidence(id) ON DELETE RESTRICT,
  expected_amount_minor_units  bigint NOT NULL CHECK (expected_amount_minor_units >= 0),
  actual_amount_minor_units    bigint NOT NULL CHECK (actual_amount_minor_units >= 0),
  difference_minor_units       bigint NOT NULL,
  currency                     text NOT NULL,
  trigger_reason               text NOT NULL DEFAULT 'cod_collection_variance',
  status                       text NOT NULL DEFAULT 'open',
  assigned_to_operator_id      text,
  assigned_at                  timestamptz,
  investigation_note           text NOT NULL DEFAULT '',
  resolved_by_operator_id      text,
  resolution_action            text,
  resolution_note              text NOT NULL DEFAULT '',
  resolved_at                  timestamptz,
  created_at                   timestamptz NOT NULL DEFAULT now(),
  updated_at                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_cod_reconciliation_difference_chk
    CHECK (difference_minor_units = actual_amount_minor_units - expected_amount_minor_units),
  CONSTRAINT wlt_cod_reconciliation_non_zero_chk
    CHECK (difference_minor_units <> 0),
  CONSTRAINT wlt_cod_reconciliation_status_chk
    CHECK (status IN ('open', 'investigating', 'resolved')),
  CONSTRAINT wlt_cod_reconciliation_action_chk
    CHECK (resolution_action IS NULL OR resolution_action IN ('confirmed_variance', 'cash_adjustment', 'collector_recovery', 'write_off')),
  UNIQUE (cod_record_id),
  UNIQUE (custody_evidence_id)
);

CREATE INDEX IF NOT EXISTS wlt_cod_reconciliation_status_created_idx
  ON wlt_cod_reconciliation_cases(status, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_cod_reconciliation_audit_events (
  id                     text PRIMARY KEY DEFAULT ('wcrae_' || gen_random_uuid()::text),
  reconciliation_case_id text NOT NULL REFERENCES wlt_cod_reconciliation_cases(id) ON DELETE RESTRICT,
  cod_record_id          text NOT NULL REFERENCES wlt_cod_records(id) ON DELETE RESTRICT,
  event_type             text NOT NULL,
  from_status            text,
  to_status              text NOT NULL,
  actor_id               text,
  metadata               jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_cod_reconciliation_audit_event_chk
    CHECK (event_type IN ('opened', 'assigned', 'reassigned', 'resolved'))
);

CREATE INDEX IF NOT EXISTS wlt_cod_reconciliation_audit_case_created_idx
  ON wlt_cod_reconciliation_audit_events(reconciliation_case_id, created_at, id);

CREATE OR REPLACE FUNCTION wlt_jrn038_capture_reconciliation_audit()
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
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO wlt_cod_reconciliation_audit_events
    (reconciliation_case_id, cod_record_id, event_type, from_status, to_status, actor_id, metadata)
  VALUES
    (NEW.id, NEW.cod_record_id, audit_event_type,
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

DROP TRIGGER IF EXISTS wlt_jrn038_cod_reconciliation_audit_trigger ON wlt_cod_reconciliation_cases;
CREATE TRIGGER wlt_jrn038_cod_reconciliation_audit_trigger
AFTER INSERT OR UPDATE ON wlt_cod_reconciliation_cases
FOR EACH ROW EXECUTE FUNCTION wlt_jrn038_capture_reconciliation_audit();

CREATE OR REPLACE FUNCTION wlt_jrn038_reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'WLT COD reconciliation audit events are immutable';
END
$$;

DROP TRIGGER IF EXISTS wlt_jrn038_cod_reconciliation_audit_immutable_trigger ON wlt_cod_reconciliation_audit_events;
CREATE TRIGGER wlt_jrn038_cod_reconciliation_audit_immutable_trigger
BEFORE UPDATE OR DELETE ON wlt_cod_reconciliation_audit_events
FOR EACH ROW EXECUTE FUNCTION wlt_jrn038_reject_audit_mutation();

COMMENT ON TABLE wlt_cod_custody_evidence IS
  'Immutable proof and accounting linkage for COD collection/remittance events.';
COMMENT ON TABLE wlt_cod_reconciliation_cases IS
  'COD-specific expected-vs-actual variance workflow with assignment, investigation and resolution truth.';
COMMENT ON TABLE wlt_cod_reconciliation_audit_events IS
  'Append-only custody reconciliation audit trail for opening, assignment, reassignment and resolution.';
