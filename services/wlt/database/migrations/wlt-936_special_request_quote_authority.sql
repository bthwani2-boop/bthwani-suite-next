-- WLT-936: WLT-owned special-request quote authority.
--
-- DSH may submit operational proposal evidence, but only WLT may turn that
-- proposal into a versioned, bounded, customer-accepted financial quote.

CREATE TABLE IF NOT EXISTS wlt_special_request_quote_policies (
  policy_id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK (version > 0),
  min_amount_minor_units BIGINT NOT NULL CHECK (min_amount_minor_units > 0),
  max_amount_minor_units BIGINT NOT NULL CHECK (max_amount_minor_units >= min_amount_minor_units),
  quote_validity_seconds INTEGER NOT NULL CHECK (quote_validity_seconds BETWEEN 60 AND 86400),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO wlt_special_request_quote_policies (
  policy_id, version, min_amount_minor_units, max_amount_minor_units, quote_validity_seconds
)
VALUES ('special-request-standard', 1, 1, 1000000000000, 900)
ON CONFLICT (policy_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS wlt_special_request_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_context_id TEXT NOT NULL,
  special_request_id UUID NOT NULL,
  client_id UUID NOT NULL,
  policy_id TEXT NOT NULL REFERENCES wlt_special_request_quote_policies(policy_id),
  policy_version INTEGER NOT NULL CHECK (policy_version > 0),
  quote_version INTEGER NOT NULL CHECK (quote_version > 0),
  proposed_amount_minor_units BIGINT NOT NULL CHECK (proposed_amount_minor_units > 0),
  proposed_currency TEXT NOT NULL CHECK (proposed_currency = upper(proposed_currency) AND char_length(proposed_currency) = 3),
  proposal_reason TEXT NOT NULL CHECK (char_length(btrim(proposal_reason)) >= 5),
  amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
  currency TEXT NOT NULL CHECK (currency = upper(currency) AND char_length(currency) = 3),
  quote_hash TEXT NOT NULL CHECK (char_length(quote_hash) = 64),
  request_hash TEXT NOT NULL CHECK (char_length(request_hash) = 64),
  status TEXT NOT NULL CHECK (status IN ('active', 'superseded', 'expired', 'accepted', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL,
  correlation_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (operator_context_id, special_request_id, quote_version),
  UNIQUE (operator_context_id, special_request_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_wlt_special_request_quotes_active
  ON wlt_special_request_quotes (operator_context_id, special_request_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_wlt_special_request_quotes_lookup
  ON wlt_special_request_quotes (operator_context_id, special_request_id, created_at DESC);
