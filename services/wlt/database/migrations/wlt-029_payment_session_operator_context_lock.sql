-- WLT-029: lock payment sessions to an explicit trusted OperatorContext identity.
--
-- Legacy development rows are backfilled once during migration. Runtime code
-- no longer falls back to a synthetic OperatorContext and every new session must carry
-- the OperatorContext resolved by authenticated DSH identity.

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE wlt_payment_sessions
SET operator_context_id = 'OperatorContext-dev-001'
WHERE operator_context_id IS NULL OR btrim(operator_context_id) = '';

ALTER TABLE wlt_payment_sessions
  ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_operator_context_id_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_operator_context_id_chk CHECK (btrim(operator_context_id) <> '');

CREATE INDEX IF NOT EXISTS wlt_payment_sessions_operator_context_id_idx
  ON wlt_payment_sessions (operator_context_id, created_at DESC, id DESC);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_OperatorContext_checkout_uq
  ON wlt_payment_sessions (operator_context_id, checkout_intent_id)
  WHERE checkout_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_OperatorContext_special_request_uq
  ON wlt_payment_sessions (operator_context_id, special_request_id)
  WHERE special_request_id IS NOT NULL;

COMMENT ON COLUMN wlt_payment_sessions.operator_context_id IS
  'Trusted DSH identity OperatorContext. Mandatory; runtime fallback is forbidden.';
