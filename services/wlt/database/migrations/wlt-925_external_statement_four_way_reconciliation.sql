-- WLT-925: Authoritative external statements and payout four-way reconciliation.
--
-- A screenshot/evidence reference is never sufficient to finalize a payout.
-- Completion must be anchored to an immutable statement artifact and a matched
-- record tying one approved snapshot, frozen batch row, execution evidence and
-- authoritative external statement line together.

BEGIN;

ALTER TABLE wlt_approved_payout_snapshots
  ADD CONSTRAINT wlt_approved_payout_snapshots_context_id_uq
  UNIQUE (operator_context_id, id);

CREATE TABLE IF NOT EXISTS wlt_external_provider_accounts (
  id text PRIMARY KEY DEFAULT ('wepa_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  provider_key text NOT NULL,
  account_reference_hash text NOT NULL,
  currency text NOT NULL,
  opening_balance_minor_units bigint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_external_provider_accounts_identity_uq
    UNIQUE (operator_context_id, provider_key, account_reference_hash, currency),
  CONSTRAINT wlt_external_provider_accounts_currency_chk CHECK (btrim(currency) <> '')
);

CREATE TABLE IF NOT EXISTS wlt_external_provider_statements (
  id text PRIMARY KEY DEFAULT ('weps_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  external_provider_account_id text NOT NULL REFERENCES wlt_external_provider_accounts(id) ON DELETE RESTRICT,
  statement_reference text NOT NULL,
  artifact_sha256 text NOT NULL,
  business_date date NOT NULL,
  closing_balance_minor_units bigint NOT NULL,
  currency text NOT NULL,
  imported_by_operator_id text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_external_provider_statements_reference_uq
    UNIQUE (operator_context_id, external_provider_account_id, statement_reference),
  CONSTRAINT wlt_external_provider_statements_artifact_uq
    UNIQUE (operator_context_id, artifact_sha256),
  CONSTRAINT wlt_external_provider_statements_hash_chk
    CHECK (artifact_sha256 ~ '^[a-f0-9]{64}$')
);

CREATE TABLE IF NOT EXISTS wlt_external_provider_statement_lines (
  id text PRIMARY KEY DEFAULT ('wepsl_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  statement_id text NOT NULL REFERENCES wlt_external_provider_statements(id) ON DELETE RESTRICT,
  external_transfer_reference text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  amount_minor_units bigint NOT NULL CHECK (amount_minor_units > 0),
  currency text NOT NULL,
  destination_reference_hash text NOT NULL,
  occurred_at timestamptz,
  source_record jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_external_provider_statement_lines_reference_uq
    UNIQUE (operator_context_id, statement_id, external_transfer_reference),
  CONSTRAINT wlt_external_provider_statement_lines_destination_hash_chk
    CHECK (destination_reference_hash ~ '^[a-f0-9]{64}$')
);

CREATE INDEX IF NOT EXISTS wlt_external_provider_statement_lines_match_idx
  ON wlt_external_provider_statement_lines
  (operator_context_id, external_transfer_reference, amount_minor_units, currency);

CREATE TABLE IF NOT EXISTS wlt_payout_four_way_reconciliations (
  id text PRIMARY KEY DEFAULT ('wpfwr_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  payout_request_id text NOT NULL,
  approved_snapshot_id text NOT NULL,
  settlement_batch_id text NOT NULL,
  manual_transfer_evidence_id text NOT NULL,
  statement_line_id text NOT NULL REFERENCES wlt_external_provider_statement_lines(id) ON DELETE RESTRICT,
  result text NOT NULL CHECK (result IN (
    'MATCHED', 'UNMATCHED', 'AMOUNT_MISMATCH', 'DESTINATION_MISMATCH',
    'DUPLICATE_REFERENCE', 'MISSING_TRANSFER', 'UNKNOWN_EXTERNAL_TRANSACTION', 'NEEDS_REVIEW'
  )),
  reconciled_by_operator_id text NOT NULL,
  reconciled_at timestamptz NOT NULL DEFAULT now(),
  canonical_ledger_transaction_id text,
  CONSTRAINT wlt_payout_four_way_reconciliations_payout_uq
    UNIQUE (operator_context_id, payout_request_id),
  CONSTRAINT wlt_payout_four_way_reconciliations_snapshot_fk
    FOREIGN KEY (operator_context_id, approved_snapshot_id)
    REFERENCES wlt_approved_payout_snapshots (operator_context_id, id) ON DELETE RESTRICT,
  CONSTRAINT wlt_payout_four_way_reconciliations_evidence_fk
    FOREIGN KEY (manual_transfer_evidence_id)
    REFERENCES wlt_manual_transfer_evidence(id) ON DELETE RESTRICT,
  CONSTRAINT wlt_payout_four_way_reconciliations_batch_fk
    FOREIGN KEY (settlement_batch_id)
    REFERENCES wlt_settlement_batches(id) ON DELETE RESTRICT,
  CONSTRAINT wlt_payout_four_way_reconciliations_ledger_fk
    FOREIGN KEY (canonical_ledger_transaction_id)
    REFERENCES wlt_ledger_transactions(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS wlt_payout_four_way_reconciliations_close_gate_idx
  ON wlt_payout_four_way_reconciliations (operator_context_id, result, reconciled_at DESC);

CREATE OR REPLACE FUNCTION wlt_reject_external_statement_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'authoritative external statement artifacts and lines are immutable';
END
$$;

DROP TRIGGER IF EXISTS wlt_external_provider_statements_immutable_trigger ON wlt_external_provider_statements;
CREATE TRIGGER wlt_external_provider_statements_immutable_trigger
BEFORE UPDATE OR DELETE ON wlt_external_provider_statements
FOR EACH ROW EXECUTE FUNCTION wlt_reject_external_statement_mutation();

DROP TRIGGER IF EXISTS wlt_external_provider_statement_lines_immutable_trigger ON wlt_external_provider_statement_lines;
CREATE TRIGGER wlt_external_provider_statement_lines_immutable_trigger
BEFORE UPDATE OR DELETE ON wlt_external_provider_statement_lines
FOR EACH ROW EXECUTE FUNCTION wlt_reject_external_statement_mutation();

COMMIT;
