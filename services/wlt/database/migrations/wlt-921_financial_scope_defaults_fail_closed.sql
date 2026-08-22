-- WLT-921: financial outbox/session scope must be explicit and non-empty.
-- Historical rows remain readable; new writes may not inherit a synthetic scope.

BEGIN;

ALTER TABLE wlt_payment_sessions
  ALTER COLUMN operator_context_id DROP DEFAULT,
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_dsh_outbox_events
  ALTER COLUMN operator_context_id DROP DEFAULT,
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_operator_context_nonblank_chk;
ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_operator_context_nonblank_chk
  CHECK (btrim(operator_context_id) <> '');

ALTER TABLE wlt_dsh_outbox_events
  DROP CONSTRAINT IF EXISTS wlt_dsh_outbox_events_operator_context_nonblank_chk;
ALTER TABLE wlt_dsh_outbox_events
  ADD CONSTRAINT wlt_dsh_outbox_events_operator_context_nonblank_chk
  CHECK (btrim(operator_context_id) <> '');

COMMIT;
