-- WLT-001: Minimal payment sessions for DSH checkout handoff.
-- This is reference creation/read only. It does not debit wallets, post ledger
-- entries, capture provider payments, finalize refunds, or settle funds.

CREATE TABLE IF NOT EXISTS wlt_payment_sessions (
  id                 text PRIMARY KEY DEFAULT ('wps_' || gen_random_uuid()::text),
  checkout_intent_id text NOT NULL,
  client_id          text NOT NULL,
  store_id           text NOT NULL,
  payment_method     text NOT NULL DEFAULT 'cod',
  status             text NOT NULL DEFAULT 'reference_created',
  provider_reference text NOT NULL DEFAULT '',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_payment_sessions_payment_method_chk
    CHECK (payment_method IN ('cod', 'wallet', 'mixed', 'official_wallet')),
  CONSTRAINT wlt_payment_sessions_status_chk
    CHECK (status IN ('reference_created', 'pending_provider', 'failed', 'expired'))
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_checkout_intent_idx
  ON wlt_payment_sessions (checkout_intent_id);

CREATE INDEX IF NOT EXISTS wlt_payment_sessions_client_idx
  ON wlt_payment_sessions (client_id, updated_at DESC);
