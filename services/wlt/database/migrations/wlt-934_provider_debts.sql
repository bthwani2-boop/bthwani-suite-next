-- WLT-934: record provider liabilities as canonical receivables.
-- A penalty must never disappear just because spendable wallet funds are
-- insufficient. The wallet leg and the receivable leg are both balanced in
-- the same immutable ledger transaction.

CREATE TABLE IF NOT EXISTS wlt_provider_debts (
  id                         text PRIMARY KEY DEFAULT ('wdebt_' || gen_random_uuid()::text),
  operator_context_id        text NOT NULL CHECK (btrim(operator_context_id) <> ''),
  provider_actor_id          text NOT NULL CHECK (btrim(provider_actor_id) <> ''),
  provider_actor_type        text NOT NULL CHECK (provider_actor_type IN ('captain','field')),
  source_type                text NOT NULL CHECK (source_type = 'provider_penalty'),
  source_id                  text NOT NULL CHECK (btrim(source_id) <> ''),
  policy_id                  text NOT NULL CHECK (btrim(policy_id) <> ''),
  policy_version             text NOT NULL CHECK (btrim(policy_version) <> ''),
  original_amount_minor_units bigint NOT NULL CHECK (original_amount_minor_units > 0),
  outstanding_amount_minor_units bigint NOT NULL CHECK (outstanding_amount_minor_units >= 0),
  currency                   text NOT NULL CHECK (char_length(currency) = 3 AND currency = upper(currency)),
  status                     text NOT NULL DEFAULT 'open' CHECK (status IN ('open','partially_settled','settled','reversed','written_off')),
  ledger_transaction_id      text NOT NULL REFERENCES wlt_ledger_transactions(id),
  settled_at                 timestamptz,
  reversed_at                timestamptz,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (operator_context_id, source_type, source_id),
  CHECK (outstanding_amount_minor_units <= original_amount_minor_units),
  CHECK (status NOT IN ('settled','reversed','written_off') OR outstanding_amount_minor_units = 0),
  CHECK (status <> 'open' OR outstanding_amount_minor_units > 0)
);

CREATE INDEX IF NOT EXISTS wlt_provider_debts_actor_status_idx
  ON wlt_provider_debts(operator_context_id, provider_actor_type, provider_actor_id, status, currency);

ALTER TABLE wlt_ledger_accounts
  DROP CONSTRAINT IF EXISTS wlt_ledger_accounts_type_chk;

ALTER TABLE wlt_ledger_accounts
  ADD CONSTRAINT wlt_ledger_accounts_type_chk CHECK (
    account_type IN (
      'wallet',
      'platform_revenue',
      'platform_payable',
      'provider_clearing',
      'provider_receivable',
      'cash_in_transit',
      'cash_variance',
      'platform_commission_receivable',
      'external_settlement_cash',
      'payment_processing_expense',
      'platform_capital_contribution',
      'promotion_funding_expense',
      'partner_promotion_receivable'
    )
  );

ALTER TABLE wlt_provider_penalties
  ADD COLUMN IF NOT EXISTS debt_id text,
  ADD COLUMN IF NOT EXISTS wallet_applied_amount_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS debt_amount_minor_units bigint NOT NULL DEFAULT 0;

UPDATE wlt_provider_penalties
SET wallet_applied_amount_minor_units = amount_minor_units,
    debt_amount_minor_units = 0
WHERE wallet_applied_amount_minor_units = 0
  AND debt_amount_minor_units = 0;

ALTER TABLE wlt_provider_penalties
  ADD CONSTRAINT wlt_provider_penalties_wallet_applied_chk
    CHECK (wallet_applied_amount_minor_units >= 0),
  ADD CONSTRAINT wlt_provider_penalties_debt_amount_chk
    CHECK (debt_amount_minor_units >= 0),
  ADD CONSTRAINT wlt_provider_penalties_applied_sum_chk
    CHECK (wallet_applied_amount_minor_units + debt_amount_minor_units = amount_minor_units);

CREATE INDEX IF NOT EXISTS wlt_provider_penalties_debt_idx
  ON wlt_provider_penalties(operator_context_id, debt_id)
  WHERE debt_id IS NOT NULL;

COMMENT ON TABLE wlt_provider_debts IS
  'WLT-owned provider receivable/debt. Outstanding liability blocks financial eligibility until settled, reversed or governed off.';
