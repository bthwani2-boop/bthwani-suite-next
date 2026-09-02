-- WLT-965: drop dead compatibility views wlt_wallet_refs and wlt_wallet_balances.
-- Canonical wallet accounting is owned exclusively by double-entry ledger accounts.
-- Materialized projection is in wlt_wallets; zero live readers exist for legacy views.

BEGIN;

DROP VIEW IF EXISTS wlt_wallet_refs;
DROP VIEW IF EXISTS wlt_wallet_balances;

COMMIT;
