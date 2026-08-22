-- DSH partner order transition receipts and decision request fingerprints.
-- This is a forward-only extension: it makes preparation transitions replay-safe
-- without changing the immutable order or decision history.
BEGIN;

ALTER TABLE dsh_partner_order_decisions
  ADD COLUMN IF NOT EXISTS request_fingerprint TEXT;

UPDATE dsh_partner_order_decisions
SET request_fingerprint = encode(
  digest(
    concat_ws('|', order_id::text, store_id, decision, coalesce(reason_code, ''), coalesce(reason_note, '')),
    'sha256'
  ),
  'hex'
)
WHERE request_fingerprint IS NULL;

ALTER TABLE dsh_partner_order_decisions
  ALTER COLUMN request_fingerprint SET NOT NULL;

CREATE TABLE IF NOT EXISTS dsh_partner_order_transition_receipts (
  store_id TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE RESTRICT,
  order_id UUID NOT NULL REFERENCES dsh_orders(id) ON DELETE RESTRICT,
  operation TEXT NOT NULL CHECK (operation IN ('prepare', 'ready')),
  idempotency_key TEXT NOT NULL CHECK (char_length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  request_fingerprint TEXT NOT NULL CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  expected_version INTEGER NOT NULL CHECK (expected_version > 0),
  result_version INTEGER NOT NULL CHECK (result_version > 0),
  actor_id TEXT NOT NULL CHECK (char_length(btrim(actor_id)) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (store_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_order_transition_receipts_order
  ON dsh_partner_order_transition_receipts(store_id, order_id, created_at DESC);

COMMIT;
