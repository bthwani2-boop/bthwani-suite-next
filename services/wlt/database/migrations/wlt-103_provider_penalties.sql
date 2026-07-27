-- WLT-103: governed provider penalties.
-- Workforce owns the operational incident and approved amount. WLT owns the
-- wallet debit, immutable financial reference and balanced ledger posting.

CREATE TABLE IF NOT EXISTS wlt_provider_penalties (
  id                              text PRIMARY KEY DEFAULT ('wpen_' || gen_random_uuid()::text),
  tenant_id                       text NOT NULL CHECK (btrim(tenant_id) <> ''),
  incident_id                     text NOT NULL CHECK (btrim(incident_id) <> ''),
  provider_actor_id               text NOT NULL CHECK (btrim(provider_actor_id) <> ''),
  provider_actor_type             text NOT NULL CHECK (provider_actor_type IN ('captain','field')),
  amount_minor_units              bigint NOT NULL CHECK (amount_minor_units > 0),
  currency                        text NOT NULL CHECK (char_length(currency) = 3),
  reason                          text NOT NULL CHECK (char_length(btrim(reason)) >= 3),
  status                          text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','reversed')),
  ledger_transaction_id           text NOT NULL REFERENCES wlt_ledger_transactions(id),
  reversal_ledger_transaction_id  text REFERENCES wlt_ledger_transactions(id),
  posted_by_actor_id              text NOT NULL,
  reversed_by_actor_id            text,
  reversed_reason                 text,
  idempotency_key                 text NOT NULL,
  created_at                      timestamptz NOT NULL DEFAULT now(),
  reversed_at                     timestamptz,
  updated_at                      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, incident_id),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (status <> 'reversed' OR (reversal_ledger_transaction_id IS NOT NULL AND reversed_at IS NOT NULL AND btrim(COALESCE(reversed_reason,'')) <> ''))
);

CREATE INDEX IF NOT EXISTS wlt_provider_penalties_actor_idx
  ON wlt_provider_penalties(tenant_id, provider_actor_type, provider_actor_id, created_at DESC);

COMMENT ON TABLE wlt_provider_penalties IS
  'WLT-owned wallet debit and reversal records generated from governed Workforce incidents.';
