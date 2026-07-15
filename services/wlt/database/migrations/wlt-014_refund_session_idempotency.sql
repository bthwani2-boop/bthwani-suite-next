-- WLT-014: Refund idempotency-by-session (defense in depth)
--
-- The application layer (refund.CreateRefund) already checks-then-inserts
-- inside a transaction so at most one non-rejected refund is created per
-- payment session. This partial unique index is the DB-level backstop in
-- case two concurrent requests slip past that application check: the
-- second insert fails with a unique-violation instead of creating a
-- duplicate refund row for the same session.
CREATE UNIQUE INDEX IF NOT EXISTS wlt_refunds_active_session_idx
  ON wlt_refunds(payment_session_id)
  WHERE status != 'rejected';
