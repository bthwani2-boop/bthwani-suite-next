-- WLT-122: Daily finance close and audit pack
-- Enforces treasury controls, blocking gates, and immutable closing of a business date.

BEGIN;

CREATE TABLE IF NOT EXISTS wlt_settlement_audit_packs (
  id text PRIMARY KEY DEFAULT ('wsap_' || gen_random_uuid()::text),
  batch_id text NOT NULL REFERENCES wlt_settlement_batches(id) ON DELETE RESTRICT,
  provider_statement_reference text NOT NULL,
  control_total_minor_units bigint NOT NULL,
  evidence_count integer NOT NULL,
  generated_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_settlement_audit_packs_uq UNIQUE (batch_id)
);

CREATE TABLE IF NOT EXISTS wlt_daily_finance_close (
  business_date date PRIMARY KEY,
  operator_context_id text NOT NULL,
  total_payouts_minor_units bigint NOT NULL,
  total_cashin_minor_units bigint NOT NULL,
  closing_balance_minor_units bigint NOT NULL,
  closed_by_operator_id text NOT NULL,
  closed_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
