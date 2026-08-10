-- WLT-120: Settlement batches
-- Groups approved payout snapshots into frozen immutable artifacts for execution.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_settlement_batches (
  id text PRIMARY KEY DEFAULT ('wsb_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  provider_id text NOT NULL,
  currency text NOT NULL,
  batch_hash text NOT NULL,
  control_total_minor_units bigint NOT NULL,
  row_count integer NOT NULL,
  created_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'frozen', 'cancelled', 'completed')),
  frozen_at timestamptz
);

CREATE TABLE IF NOT EXISTS wlt_settlement_batch_rows (
  batch_id text NOT NULL REFERENCES wlt_settlement_batches(id) ON DELETE RESTRICT,
  approved_snapshot_id text NOT NULL REFERENCES wlt_approved_payout_snapshots(id) ON DELETE RESTRICT,
  PRIMARY KEY (batch_id, approved_snapshot_id)
);

CREATE INDEX wlt_settlement_batches_context_idx
  ON wlt_settlement_batches (operator_context_id, provider_id, status);

COMMIT;
