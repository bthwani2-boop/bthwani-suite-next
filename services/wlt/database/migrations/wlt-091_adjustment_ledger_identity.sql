-- WLT-091: every commission adjustment is its own accounting event.
--
-- The original settlements-commissions table made request_hash globally unique. That prevented
-- a legitimate later adjustment from repeating the same delta/reason/operator,
-- even when it carried a new idempotency key. Idempotency is owned by the
-- unique idempotency_key; request_hash remains indexed for diagnostics only.

BEGIN;

ALTER TABLE wlt_commission_adjustments
  DROP CONSTRAINT IF EXISTS wlt_commission_adjustments_request_hash_key;

CREATE INDEX IF NOT EXISTS wlt_commission_adjustments_request_hash_idx
  ON wlt_commission_adjustments(request_hash);

CREATE INDEX IF NOT EXISTS wlt_commission_adjustments_commission_created_idx
  ON wlt_commission_adjustments(commission_id, created_at, id);

COMMIT;
