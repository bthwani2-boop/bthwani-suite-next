-- WLT-963: pin a partial unique index on wlt_commission_adjustments so the
-- ON CONFLICT arbiter in ApplyGovernedCommissionAdjustment matches an actual
-- predicate, eliminating pq 42P18 'could not determine data type of parameter'
-- when the prepared statement parameters cannot otherwise be anchored to a
-- non-partial composite unique index. Mirrors the dsh-1050 partial-index
-- pattern; the existing non-partial composite unique index from wlt-107 is
-- retained as the data-integrity guarantee.

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_commission_adjustments_operator_context_idempotency
    ON wlt_commission_adjustments (operator_context_id, idempotency_key)
    WHERE idempotency_key IS NOT NULL AND btrim(idempotency_key) <> '';
