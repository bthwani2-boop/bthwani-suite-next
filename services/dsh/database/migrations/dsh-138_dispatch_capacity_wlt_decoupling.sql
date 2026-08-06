-- dsh-138_dispatch_capacity_wlt_decoupling.sql

-- 1. Remove copied financial truth (balances, thresholds, currency) from DSH.
-- DSH strictly relies on an opaque boolean 'eligible' from WLT and a decision reference.
ALTER TABLE dsh_captain_financial_eligibility
    DROP COLUMN IF EXISTS wallet_id,
    DROP COLUMN IF EXISTS wallet_status,
    DROP COLUMN IF EXISTS available_balance_minor_units,
    DROP COLUMN IF EXISTS minimum_dispatch_balance_minor_units,
    DROP COLUMN IF EXISTS currency;

-- 2. Add WLT decision ref columns to capture the decision audit without the financial data.
ALTER TABLE dsh_captain_financial_eligibility
    ADD COLUMN IF NOT EXISTS wlt_decision_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS wlt_reason_code TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS wlt_policy_version TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS evaluated_at TIMESTAMPTZ NOT NULL DEFAULT now();
