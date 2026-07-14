-- WLT-011: Field Finance / Universal Ledger and Commissions
-- Alter wlt_ledger_entries for universal actors
ALTER TABLE wlt_ledger_entries
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS source_id text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS visit_id text,
  ADD COLUMN IF NOT EXISTS store_id text,
  ADD COLUMN IF NOT EXISTS partner_id text,
  ADD COLUMN IF NOT EXISTS commission_event_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text;

ALTER TABLE wlt_ledger_entries DROP CONSTRAINT IF EXISTS wlt_ledger_actor_type_chk;
ALTER TABLE wlt_ledger_entries ADD CONSTRAINT wlt_ledger_actor_type_chk CHECK (actor_type IN ('client','partner','captain','system','platform','field'));

CREATE UNIQUE INDEX IF NOT EXISTS wlt_ledger_idempotency_idx ON wlt_ledger_entries(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Alter wlt_commissions for universal beneficiary
ALTER TABLE wlt_commissions
  ADD COLUMN IF NOT EXISTS beneficiary_actor_id text,
  ADD COLUMN IF NOT EXISTS beneficiary_actor_type text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS visit_id text,
  ADD COLUMN IF NOT EXISTS store_id text,
  ADD COLUMN IF NOT EXISTS commission_policy_id text,
  ADD COLUMN IF NOT EXISTS earned_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS held_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS approved_by text;

-- Data migration for existing rows (default to captain if beneficiary_actor_id is null)
UPDATE wlt_commissions SET beneficiary_actor_id = captain_id, beneficiary_actor_type = 'captain', source_type = 'order', source_id = order_id WHERE beneficiary_actor_id IS NULL;

-- Now make them not null where appropriate
ALTER TABLE wlt_commissions 
  ALTER COLUMN beneficiary_actor_id SET NOT NULL,
  ALTER COLUMN beneficiary_actor_type SET NOT NULL,
  ALTER COLUMN source_type SET NOT NULL,
  ALTER COLUMN source_id SET NOT NULL;

-- Allow order_id, captain_id to be null for field commissions
ALTER TABLE wlt_commissions ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE wlt_commissions ALTER COLUMN captain_id DROP NOT NULL;
ALTER TABLE wlt_commissions ALTER COLUMN partner_id DROP NOT NULL;

ALTER TABLE wlt_commissions DROP CONSTRAINT IF EXISTS wlt_commissions_type_chk;
ALTER TABLE wlt_commissions ADD CONSTRAINT wlt_commissions_type_chk CHECK (commission_type IN ('delivery_fee','platform_fee','cod_fee','partner_discount','field_visit_fee'));

ALTER TABLE wlt_commissions DROP CONSTRAINT IF EXISTS wlt_commissions_status_chk;
ALTER TABLE wlt_commissions ADD CONSTRAINT wlt_commissions_status_chk CHECK (status IN ('pending','confirmed','settled','reversed', 'earned_pending_review', 'approved_pending_posting', 'posted_pending_settlement', 'held', 'rejected', 'paid'));

CREATE UNIQUE INDEX IF NOT EXISTS wlt_commissions_idempotency_idx ON wlt_commissions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Create wlt_payout_requests
CREATE TABLE IF NOT EXISTS wlt_payout_requests (
  id text PRIMARY KEY DEFAULT ('wpor_' || gen_random_uuid()::text),
  beneficiary_actor_id text NOT NULL,
  beneficiary_actor_type text NOT NULL,
  amount_minor_units bigint NOT NULL,
  currency text NOT NULL DEFAULT 'YER',
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  rejected_at timestamptz,
  processed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  failure_reason text,
  operator_id text,
  idempotency_key text,
  CONSTRAINT wlt_payout_requests_status_chk CHECK (status IN ('pending', 'approved', 'rejected', 'processing', 'completed', 'failed'))
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_requests_idempotency_idx ON wlt_payout_requests(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Upgrade wlt_wallet_refs to a full read model (or rename to wlt_wallets)
ALTER TABLE wlt_wallet_refs
  ADD COLUMN IF NOT EXISTS available_balance_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pending_balance_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS held_balance_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS earned_total_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS settled_total_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_total_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_ledger_entry_at timestamptz;

-- Also rename it to wlt_wallets for clarity if not already done, but to avoid breaking existing queries, we might just keep the name or add a view
ALTER TABLE wlt_wallet_refs RENAME TO wlt_wallets;

-- For backward compatibility with things expecting wlt_wallet_refs
CREATE OR REPLACE VIEW wlt_wallet_refs AS SELECT * FROM wlt_wallets;

