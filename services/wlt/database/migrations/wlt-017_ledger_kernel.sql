-- WLT-017: Constrained double-entry ledger kernel.
--
-- Every financial event (payment capture, refund, payout, settlement,
-- commission posting) that adopts this kernel writes exactly one debit line
-- and one credit line under a shared ledger_transaction_id, in the same DB
-- transaction as its own status change. sum(debit) == sum(credit) is
-- enforced by application code (internal/ledger.PostLedgerTransaction), not
-- by a DB constraint, because Postgres CHECK constraints cannot aggregate
-- across sibling rows.
--
-- This is intentionally NOT a general chart-of-accounts / journal system: a
-- small fixed enum of account types is used (wallet, platform_revenue,
-- platform_payable, provider_clearing, platform_commission_receivable). Each
-- account's balance_minor_units is a plain running total where a debit line
-- adds to it and a credit line subtracts from it -- there is no per-account-
-- type normal-balance-side convention (asset vs. liability vs. equity); the
-- only invariant enforced is that every transaction's debits equal its
-- credits.
--
-- wlt_ledger_entries (the old single-row-per-event audit log from wlt-006)
-- is left untouched. New code writes only to the tables below; existing
-- readers of wlt_ledger_entries are unaffected until they are migrated over
-- in a later pass.

CREATE TABLE IF NOT EXISTS wlt_ledger_accounts (
  id                  text PRIMARY KEY DEFAULT ('wlacc_' || gen_random_uuid()::text),
  account_type        text NOT NULL,
  actor_type          text,
  actor_id            text,
  currency            text NOT NULL DEFAULT 'YER',
  balance_minor_units bigint NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_ledger_accounts_type_chk CHECK (
    account_type IN (
      'wallet',
      'platform_revenue',
      'platform_payable',
      'provider_clearing',
      'platform_commission_receivable'
    )
  ),
  CONSTRAINT wlt_ledger_accounts_wallet_actor_chk CHECK (
    (account_type = 'wallet' AND actor_type IS NOT NULL AND actor_id IS NOT NULL)
    OR (account_type <> 'wallet' AND actor_id IS NULL)
  )
);

-- One wallet account per (actor_type, actor_id, currency); one system
-- account per (account_type, currency) for the non-wallet types.
CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_accounts_wallet_uq
  ON wlt_ledger_accounts (account_type, actor_type, actor_id, currency)
  WHERE account_type = 'wallet';

CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_accounts_system_uq
  ON wlt_ledger_accounts (account_type, currency)
  WHERE account_type <> 'wallet';

CREATE TABLE IF NOT EXISTS wlt_ledger_transactions (
  id                text PRIMARY KEY DEFAULT ('wltxn_' || gen_random_uuid()::text),
  transaction_type  text NOT NULL,
  reference_type    text NOT NULL DEFAULT '',
  reference_id      text NOT NULL DEFAULT '',
  created_by_actor_id   text,
  created_by_actor_type text,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_ledger_transactions_reference_idx
  ON wlt_ledger_transactions (reference_type, reference_id);

CREATE TABLE IF NOT EXISTS wlt_ledger_lines (
  id                     text PRIMARY KEY DEFAULT ('wlline_' || gen_random_uuid()::text),
  ledger_transaction_id  text NOT NULL REFERENCES wlt_ledger_transactions(id),
  account_id             text NOT NULL REFERENCES wlt_ledger_accounts(id),
  debit_credit           text NOT NULL,
  amount_minor_units     bigint NOT NULL,
  currency               text NOT NULL,
  running_balance_after  bigint NOT NULL,
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_ledger_lines_debit_credit_chk CHECK (debit_credit IN ('debit', 'credit')),
  CONSTRAINT wlt_ledger_lines_amount_chk CHECK (amount_minor_units > 0)
);

CREATE INDEX IF NOT EXISTS wlt_ledger_lines_transaction_idx
  ON wlt_ledger_lines (ledger_transaction_id);
CREATE INDEX IF NOT EXISTS wlt_ledger_lines_account_idx
  ON wlt_ledger_lines (account_id, created_at DESC);
