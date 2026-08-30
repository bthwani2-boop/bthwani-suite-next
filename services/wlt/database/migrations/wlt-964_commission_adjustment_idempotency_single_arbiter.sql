-- WLT-964: collapse the duplicate commission-adjustment idempotency uniqueness
-- authority onto the canonical partial arbiter.
--
-- wlt-107 created a non-partial composite unique index on
-- (operator_context_id, idempotency_key); wlt-963 added the partial unique
-- index with the exact predicate ApplyGovernedCommissionAdjustment's ON
-- CONFLICT arbiter requires (fixing pq 42P18 'could not determine data type of
-- parameter' when prepared-statement parameters cannot anchor to the
-- non-partial form). The governed writer rejects empty idempotency keys before
-- the insert, so the non-partial index re-enforces the partial index's
-- invariant for every reachable write while doubling the unique-arbiter cost
-- on each adjustment insert. The wlt-963 partial index is the single
-- canonical uniqueness authority for commission-adjustment idempotency.

DROP INDEX IF EXISTS wlt_commission_adjustments_operator_context_idempotency_uq;
