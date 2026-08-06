-- WLT-117: Wallet Checkpoints and Immutable Balances

-- 1. Create wallet checkpoints
CREATE TABLE IF NOT EXISTS wlt_wallet_checkpoints (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    wallet_id text NOT NULL,
    as_of_ledger_entry_id text,
    as_of_time timestamptz NOT NULL DEFAULT now(),
    available_balance_minor_units bigint NOT NULL DEFAULT 0,
    pending_balance_minor_units bigint NOT NULL DEFAULT 0,
    held_balance_minor_units bigint NOT NULL DEFAULT 0,
    earned_total_minor_units bigint NOT NULL DEFAULT 0,
    settled_total_minor_units bigint NOT NULL DEFAULT 0,
    paid_total_minor_units bigint NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT fk_wallet_checkpoints_wallet FOREIGN KEY (wallet_id) REFERENCES wlt_wallets(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wlt_wallet_checkpoints_wallet_time ON wlt_wallet_checkpoints(wallet_id, as_of_time DESC);

-- 2. Migrate existing balances to an initial checkpoint
INSERT INTO wlt_wallet_checkpoints (
    wallet_id, 
    as_of_time, 
    available_balance_minor_units, 
    pending_balance_minor_units, 
    held_balance_minor_units, 
    earned_total_minor_units, 
    settled_total_minor_units, 
    paid_total_minor_units
)
SELECT 
    id, 
    updated_at,
    COALESCE(available_balance_minor_units, 0),
    COALESCE(pending_balance_minor_units, 0),
    COALESCE(held_balance_minor_units, 0),
    COALESCE(earned_total_minor_units, 0),
    COALESCE(settled_total_minor_units, 0),
    COALESCE(paid_total_minor_units, 0)
FROM wlt_wallets;

-- 3. Drop mutable balance columns from wlt_wallets
DROP VIEW IF EXISTS wlt_wallet_refs CASCADE;
ALTER TABLE wlt_wallets DROP COLUMN available_balance_minor_units;
ALTER TABLE wlt_wallets DROP COLUMN pending_balance_minor_units;
ALTER TABLE wlt_wallets DROP COLUMN held_balance_minor_units;
ALTER TABLE wlt_wallets DROP COLUMN earned_total_minor_units;
ALTER TABLE wlt_wallets DROP COLUMN settled_total_minor_units;
ALTER TABLE wlt_wallets DROP COLUMN paid_total_minor_units;
