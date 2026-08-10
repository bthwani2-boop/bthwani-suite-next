-- WLT-121: Manual transfer evidence
-- Tracks external execution evidence mapped to frozen settlement batch rows.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_manual_transfer_evidence (
  id text PRIMARY KEY DEFAULT ('wmte_' || gen_random_uuid()::text),
  batch_id text NOT NULL REFERENCES wlt_settlement_batches(id) ON DELETE RESTRICT,
  approved_snapshot_id text NOT NULL REFERENCES wlt_approved_payout_snapshots(id) ON DELETE RESTRICT,
  external_transfer_reference text NOT NULL,
  amount_minor_units bigint NOT NULL,
  currency text NOT NULL,
  verified_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_manual_transfer_evidence_uq UNIQUE (batch_id, approved_snapshot_id),
  CONSTRAINT wlt_manual_transfer_evidence_ref_uq UNIQUE (external_transfer_reference)
);

CREATE INDEX wlt_manual_transfer_evidence_batch_idx
  ON wlt_manual_transfer_evidence (batch_id);

COMMIT;
