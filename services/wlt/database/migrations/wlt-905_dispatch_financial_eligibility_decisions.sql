-- WLT-905: authoritative dispatch financial eligibility decisions.
-- WLT owns wallet state, balances, currency, thresholds, policy, and the final
-- eligibility decision. DSH receives only opaque decision metadata.

CREATE TABLE IF NOT EXISTS wlt_dispatch_financial_eligibility_policies (
  operator_context_id                      text PRIMARY KEY CHECK (btrim(operator_context_id) <> ''),
  enabled                                  boolean NOT NULL DEFAULT true,
  require_active_wallet                    boolean NOT NULL DEFAULT true,
  minimum_dispatch_balance_minor_units     bigint NOT NULL DEFAULT 0 CHECK (minimum_dispatch_balance_minor_units >= 0),
  minimum_cod_balance_minor_units          bigint NOT NULL DEFAULT 0 CHECK (minimum_cod_balance_minor_units >= minimum_dispatch_balance_minor_units),
  currency                                 text NOT NULL DEFAULT 'YER' CHECK (char_length(currency) = 3),
  decision_ttl_seconds                     integer NOT NULL DEFAULT 120 CHECK (decision_ttl_seconds BETWEEN 30 AND 600),
  policy_version                           text NOT NULL CHECK (btrim(policy_version) <> ''),
  updated_by                               text NOT NULL DEFAULT 'system',
  updated_at                               timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wlt_dispatch_financial_eligibility_decisions (
  id                                      text PRIMARY KEY DEFAULT ('wlt_dfe_' || gen_random_uuid()::text),
  operator_context_id                     text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  captain_id                              text NOT NULL CHECK (btrim(captain_id) <> ''),
  wallet_id                               text,
  wallet_status                           text,
  available_balance_minor_units           bigint,
  required_balance_minor_units            bigint,
  currency                                text,
  eligible                                boolean NOT NULL,
  reason_code                             text NOT NULL CHECK (btrim(reason_code) <> ''),
  policy_version                          text NOT NULL CHECK (btrim(policy_version) <> ''),
  evaluated_at                            timestamptz NOT NULL,
  expires_at                              timestamptz NOT NULL,
  revoked_at                              timestamptz,
  created_at                              timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > evaluated_at),
  CHECK (revoked_at IS NULL OR revoked_at >= evaluated_at)
);

CREATE INDEX IF NOT EXISTS wlt_dispatch_financial_eligibility_decisions_lookup_idx
  ON wlt_dispatch_financial_eligibility_decisions(operator_context_id, captain_id, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS wlt_dispatch_financial_eligibility_decisions_active_idx
  ON wlt_dispatch_financial_eligibility_decisions(expires_at)
  WHERE eligible = true AND revoked_at IS NULL;

COMMENT ON TABLE wlt_dispatch_financial_eligibility_policies IS
  'WLT-owned dispatch eligibility thresholds and currency policy. DSH must never copy or evaluate these values.';

COMMENT ON TABLE wlt_dispatch_financial_eligibility_decisions IS
  'Auditable WLT-owned universal dispatch financial decisions. Only abstract decision metadata crosses into DSH.';
