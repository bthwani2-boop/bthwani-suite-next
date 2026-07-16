-- WLT-023: Genericize payment-session source identity.
--
-- wlt_payment_sessions has so far only ever been created from a DSH
-- checkout-intent handoff (checkout_intent_id NOT NULL, unique). DSH is
-- about to also create a WLT payment session for a "special request"
-- (Shein/Awnak) quote approval, which has no checkout intent at all --
-- keyed instead by special_request_id. This makes checkout_intent_id
-- optional and adds special_request_id as its sibling, with a CHECK
-- constraint enforcing that a session has exactly one source identity.
--
-- The existing checkout-intent uniqueness guarantee is preserved exactly:
-- the old unconditional unique index is replaced by a partial unique index
-- that only applies where checkout_intent_id IS NOT NULL, so two
-- checkout-sourced sessions still can never share a checkout_intent_id.
--
-- wlt_dsh_outbox_events (WLT-009) carries checkout_intent_id through to the
-- DSH notification payload for every terminal-status event; it gets the
-- same optional-checkout-intent-id / optional-special-request-id treatment
-- so a special-request-sourced session's outbox events can be enqueued and
-- delivered without ever writing/sending an empty checkout_intent_id.

ALTER TABLE wlt_payment_sessions
  ALTER COLUMN checkout_intent_id DROP NOT NULL;

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS special_request_id text;

DROP INDEX IF EXISTS wlt_payment_sessions_checkout_intent_idx;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_checkout_intent_idx
  ON wlt_payment_sessions (checkout_intent_id)
  WHERE checkout_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_special_request_idx
  ON wlt_payment_sessions (special_request_id)
  WHERE special_request_id IS NOT NULL;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_source_xor_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_source_xor_chk
  CHECK ((checkout_intent_id IS NOT NULL) <> (special_request_id IS NOT NULL));

ALTER TABLE wlt_dsh_outbox_events
  ALTER COLUMN checkout_intent_id DROP NOT NULL;

ALTER TABLE wlt_dsh_outbox_events
  ADD COLUMN IF NOT EXISTS special_request_id text;

ALTER TABLE wlt_dsh_outbox_events
  DROP CONSTRAINT IF EXISTS wlt_dsh_outbox_events_source_xor_chk;

ALTER TABLE wlt_dsh_outbox_events
  ADD CONSTRAINT wlt_dsh_outbox_events_source_xor_chk
  CHECK ((checkout_intent_id IS NOT NULL) <> (special_request_id IS NOT NULL));
