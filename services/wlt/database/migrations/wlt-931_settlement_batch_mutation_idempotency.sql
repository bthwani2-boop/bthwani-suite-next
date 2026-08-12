-- WLT-931: Settlement batch mutation idempotency and single-batch ownership.
--
-- Settlement batch creation/freeze are financially material control-plane
-- mutations. Their Idempotency-Key is durable and request-bound. An approved
-- payout snapshot may belong to exactly one settlement batch.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT approved_snapshot_id
    FROM wlt_settlement_batch_rows
    GROUP BY approved_snapshot_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'WLT-931 cannot activate: an approved payout snapshot belongs to multiple settlement batches';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_settlement_batch_rows_snapshot_uidx
  ON wlt_settlement_batch_rows (approved_snapshot_id);

CREATE TABLE IF NOT EXISTS wlt_settlement_mutation_requests (
  operator_context_id text NOT NULL,
  operation text NOT NULL
    CHECK (operation IN ('batch_create','batch_freeze')),
  idempotency_key text NOT NULL,
  request_hash text NOT NULL
    CHECK (request_hash ~ '^[a-f0-9]{64}$'),
  settlement_batch_id text NOT NULL
    REFERENCES wlt_settlement_batches(id) ON DELETE RESTRICT,
  acted_by_operator_id text NOT NULL
    CHECK (btrim(acted_by_operator_id) <> ''),
  correlation_id text NOT NULL
    CHECK (btrim(correlation_id) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (operator_context_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS wlt_settlement_mutation_requests_batch_idx
  ON wlt_settlement_mutation_requests
     (operator_context_id, settlement_batch_id, operation, created_at DESC);

COMMIT;
