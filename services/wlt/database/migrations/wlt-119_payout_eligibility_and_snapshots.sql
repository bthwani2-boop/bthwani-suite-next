-- WLT-119: Payout eligibility and immutable approval snapshots.
-- Enforces separation of duties and binds approved payouts to immutable facts.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_approved_payout_snapshots (
  id text PRIMARY KEY DEFAULT ('waps_' || gen_random_uuid()::text),
  operator_context_id text NOT NULL,
  payout_request_id text NOT NULL,
  payout_destination_id text NOT NULL,
  amount_minor_units bigint NOT NULL,
  currency text NOT NULL,
  beneficiary_actor_id text NOT NULL,
  beneficiary_actor_type text NOT NULL,
  snapshot_hash text NOT NULL,
  approved_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_approved_payout_snapshots_req_uq UNIQUE (operator_context_id, payout_request_id),
  CONSTRAINT wlt_approved_payout_snapshots_req_fk FOREIGN KEY (operator_context_id, payout_request_id)
    REFERENCES wlt_payout_requests (operator_context_id, id) ON DELETE RESTRICT,
  CONSTRAINT wlt_approved_payout_snapshots_dest_fk FOREIGN KEY (operator_context_id, payout_destination_id)
    REFERENCES wlt_payout_destinations (operator_context_id, id) ON DELETE RESTRICT
);

CREATE INDEX wlt_approved_payout_snapshots_created_idx
  ON wlt_approved_payout_snapshots (operator_context_id, created_at DESC);

COMMENT ON TABLE wlt_approved_payout_snapshots IS
  'Immutable snapshot of a payout request upon approval, locking the exact beneficiary, destination, and amount.';

COMMIT;
