-- WLT-020: Intermediate authorization_pending/capture_pending states.
--
-- Authorize/Capture previously read the session's status with a plain
-- SELECT, called the payment provider, then wrote the final status with an
-- unconditional UPDATE ... WHERE id = $1 (no re-check of status in the
-- WHERE clause). Two concurrent requests on the same session could both
-- pass the initial check and both call the provider before either write
-- landed -- a classic TOCTOU race leading to a possible double
-- authorization/capture.
--
-- The fix (internal/payment/payment.go) claims the session with a guarded
-- UPDATE ... WHERE status = $expected before calling the provider (flipping
-- it to this pending state), releases the row lock by committing that small
-- transaction, calls the provider without holding a lock across the network
-- call, then applies the final result with a second guarded
-- UPDATE ... WHERE status = 'authorization_pending'/'capture_pending'. A
-- concurrent second request's claim attempt affects 0 rows and is rejected
-- as a conflict instead of also calling the provider.

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_status_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_status_chk
  CHECK (status IN (
    'reference_created','pending_provider','authorization_pending','authorized',
    'capture_pending','captured','cod_pending','cod_collected','failed','expired',
    'provider_result_unknown'
  ));
