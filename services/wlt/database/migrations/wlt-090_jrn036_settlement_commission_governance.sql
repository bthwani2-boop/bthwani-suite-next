-- WLT-090 / JRN-036: evidence-backed settlements and commissions.
--
-- WLT remains the financial truth owner. DSH supplies immutable operational
-- evidence only. These additive tables retain request identity, policy version,
-- source evidence, reasoned adjustments, and append-only audit without moving
-- order/store ownership into WLT.

CREATE TABLE IF NOT EXISTS wlt_jrn036_settlement_requests (
  idempotency_key text PRIMARY KEY CHECK (btrim(idempotency_key) <> ''),
  request_hash text NOT NULL CHECK (btrim(request_hash) <> ''),
  settlement_id text NOT NULL REFERENCES wlt_settlements(id) ON DELETE RESTRICT,
  partner_id text NOT NULL CHECK (btrim(partner_id) <> ''),
  policy_version bigint NOT NULL CHECK (policy_version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_jrn036_settlement_request_hash_uidx
  ON wlt_jrn036_settlement_requests (request_hash);

CREATE TABLE IF NOT EXISTS wlt_jrn036_settlement_source_evidence (
  order_id text PRIMARY KEY,
  settlement_id text NOT NULL REFERENCES wlt_settlements(id) ON DELETE RESTRICT,
  pricing_snapshot_hash text NOT NULL CHECK (btrim(pricing_snapshot_hash) <> ''),
  completion_event_id text NOT NULL CHECK (btrim(completion_event_id) <> ''),
  completion_evidence_hash text NOT NULL CHECK (btrim(completion_evidence_hash) <> ''),
  cancellation_status text NOT NULL CHECK (cancellation_status IN ('not_cancelled','cancelled')),
  original_gross_minor_units bigint NOT NULL CHECK (original_gross_minor_units > 0),
  completed_refund_minor_units bigint NOT NULL DEFAULT 0 CHECK (completed_refund_minor_units >= 0),
  settlement_basis_minor_units bigint NOT NULL CHECK (settlement_basis_minor_units >= 0),
  refund_evidence_count integer NOT NULL DEFAULT 0 CHECK (refund_evidence_count >= 0),
  verified_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_jrn036_settlement_refund_basis_chk CHECK (
    original_gross_minor_units = completed_refund_minor_units + settlement_basis_minor_units
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_jrn036_settlement_completion_event_uidx
  ON wlt_jrn036_settlement_source_evidence (completion_event_id);
CREATE INDEX IF NOT EXISTS wlt_jrn036_settlement_evidence_settlement_idx
  ON wlt_jrn036_settlement_source_evidence (settlement_id, order_id);

CREATE TABLE IF NOT EXISTS wlt_jrn036_settlement_policy_versions (
  partner_id text NOT NULL CHECK (btrim(partner_id) <> ''),
  version bigint NOT NULL CHECK (version > 0),
  fee_basis_points integer NOT NULL CHECK (fee_basis_points BETWEEN 0 AND 10000),
  currency text NOT NULL CHECK (btrim(currency) <> ''),
  status text NOT NULL CHECK (status IN ('active','inactive')),
  cycle_days integer NOT NULL DEFAULT 7 CHECK (cycle_days BETWEEN 1 AND 366),
  minimum_net_minor_units bigint NOT NULL DEFAULT 0 CHECK (minimum_net_minor_units >= 0),
  change_reason text NOT NULL CHECK (btrim(change_reason) <> ''),
  updated_by_operator_id text NOT NULL CHECK (btrim(updated_by_operator_id) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, version)
);

CREATE INDEX IF NOT EXISTS wlt_jrn036_settlement_policy_current_idx
  ON wlt_jrn036_settlement_policy_versions (partner_id, version DESC);

CREATE TABLE IF NOT EXISTS wlt_jrn036_commission_policy_versions (
  policy_id text NOT NULL CHECK (btrim(policy_id) <> ''),
  version bigint NOT NULL CHECK (version > 0),
  commission_type text NOT NULL CHECK (btrim(commission_type) <> ''),
  source_type text NOT NULL CHECK (btrim(source_type) <> ''),
  beneficiary_actor_type text NOT NULL CHECK (beneficiary_actor_type IN ('partner','captain','field')),
  calculation_type text NOT NULL CHECK (calculation_type IN ('fixed','basis_points')),
  fixed_amount_minor_units bigint NOT NULL DEFAULT 0 CHECK (fixed_amount_minor_units >= 0),
  basis_points integer NOT NULL DEFAULT 0 CHECK (basis_points BETWEEN 0 AND 10000),
  minimum_amount_minor_units bigint NOT NULL DEFAULT 0 CHECK (minimum_amount_minor_units >= 0),
  maximum_amount_minor_units bigint,
  currency text NOT NULL DEFAULT 'YER' CHECK (btrim(currency) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  change_reason text NOT NULL CHECK (btrim(change_reason) <> ''),
  updated_by_actor_id text NOT NULL CHECK (btrim(updated_by_actor_id) <> ''),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (policy_id, version),
  CONSTRAINT wlt_jrn036_commission_policy_formula_chk CHECK (
    (calculation_type = 'fixed' AND fixed_amount_minor_units > 0 AND basis_points = 0)
    OR
    (calculation_type = 'basis_points' AND basis_points > 0)
  ),
  CONSTRAINT wlt_jrn036_commission_policy_cap_chk CHECK (
    maximum_amount_minor_units IS NULL OR maximum_amount_minor_units >= minimum_amount_minor_units
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_jrn036_commission_policy_active_uidx
  ON wlt_jrn036_commission_policy_versions
    (commission_type, source_type, beneficiary_actor_type)
  WHERE status = 'active';

CREATE TABLE IF NOT EXISTS wlt_jrn036_commission_evidence (
  commission_id text PRIMARY KEY REFERENCES wlt_commissions(id) ON DELETE RESTRICT,
  policy_id text NOT NULL CHECK (btrim(policy_id) <> ''),
  policy_version bigint NOT NULL CHECK (policy_version > 0),
  source_evidence_id text NOT NULL CHECK (btrim(source_evidence_id) <> ''),
  source_evidence_hash text NOT NULL CHECK (btrim(source_evidence_hash) <> ''),
  source_evidence_status text NOT NULL CHECK (source_evidence_status IN ('completed','delivered','approved')),
  gross_basis_minor_units bigint NOT NULL DEFAULT 0 CHECK (gross_basis_minor_units >= 0),
  calculated_amount_minor_units bigint NOT NULL CHECK (calculated_amount_minor_units > 0),
  idempotency_key text NOT NULL UNIQUE CHECK (btrim(idempotency_key) <> ''),
  request_hash text NOT NULL CHECK (btrim(request_hash) <> ''),
  verified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source_evidence_id, commission_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_jrn036_commission_request_hash_uidx
  ON wlt_jrn036_commission_evidence (request_hash);

CREATE TABLE IF NOT EXISTS wlt_jrn036_commission_adjustments (
  id text PRIMARY KEY DEFAULT ('wcadj_' || gen_random_uuid()::text),
  commission_id text NOT NULL REFERENCES wlt_commissions(id) ON DELETE RESTRICT,
  delta_minor_units bigint NOT NULL CHECK (delta_minor_units <> 0),
  reason text NOT NULL CHECK (btrim(reason) <> ''),
  operator_id text NOT NULL CHECK (btrim(operator_id) <> ''),
  idempotency_key text NOT NULL UNIQUE CHECK (btrim(idempotency_key) <> ''),
  request_hash text NOT NULL CHECK (btrim(request_hash) <> ''),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_jrn036_commission_adjustments_commission_idx
  ON wlt_jrn036_commission_adjustments (commission_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_jrn036_audit_events (
  id text PRIMARY KEY DEFAULT ('wja36_' || gen_random_uuid()::text),
  aggregate_type text NOT NULL CHECK (aggregate_type IN ('settlement_policy','settlement','commission_policy','commission','commission_adjustment')),
  aggregate_id text NOT NULL CHECK (btrim(aggregate_id) <> ''),
  action text NOT NULL CHECK (btrim(action) <> ''),
  actor_id text NOT NULL CHECK (btrim(actor_id) <> ''),
  actor_type text NOT NULL CHECK (btrim(actor_type) <> ''),
  reason text NOT NULL DEFAULT '',
  correlation_id text NOT NULL CHECK (btrim(correlation_id) <> ''),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_jrn036_audit_aggregate_idx
  ON wlt_jrn036_audit_events (aggregate_type, aggregate_id, created_at DESC);
CREATE INDEX IF NOT EXISTS wlt_jrn036_audit_correlation_idx
  ON wlt_jrn036_audit_events (correlation_id, created_at DESC);

-- Backfill the existing WLT-owned fixed field-visit policies into a versioned
-- JRN-036 policy without changing or trusting any DSH-supplied amount.
INSERT INTO wlt_jrn036_commission_policy_versions (
  policy_id, version, commission_type, source_type, beneficiary_actor_type,
  calculation_type, fixed_amount_minor_units, basis_points,
  minimum_amount_minor_units, maximum_amount_minor_units, currency, status,
  change_reason, updated_by_actor_id, created_at
)
SELECT
  p.id, 1, p.commission_type, 'field_visit', 'field',
  p.calculation_type, p.amount_minor_units, 0,
  p.amount_minor_units, p.amount_minor_units, p.currency, p.status,
  'migrated from sovereign WLT commission policy', p.created_by_actor_id, p.created_at
FROM wlt_commission_policies p
WHERE p.commission_type = 'field_visit_fee'
  AND p.calculation_type = 'fixed'
ON CONFLICT (policy_id, version) DO NOTHING;

COMMENT ON TABLE wlt_jrn036_settlement_source_evidence IS
  'Immutable DSH completion/cancellation evidence enriched by WLT-owned completed refund truth.';
COMMENT ON TABLE wlt_jrn036_commission_policy_versions IS
  'Versioned WLT-owned commission calculation policies; callers never supply commission truth amounts.';
COMMENT ON TABLE wlt_jrn036_commission_adjustments IS
  'Reasoned signed adjustments applied transactionally to pending or confirmed commissions.';
