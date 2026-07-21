-- WLT-031: governed settlement calculation sources.
--
-- DSH supplies delivered order identities and immutable gross snapshots. WLT
-- owns the active fee policy, computes gross/fee/net itself and prevents any
-- order from being included in more than one settlement.
--
-- PRE-RELEASE AMENDMENT: wlt_settlements.id is a governed TEXT identifier with
-- a wset_ prefix. This migration previously declared UUID and could not apply
-- to a clean sovereign WLT schema. See governance/database/migration-amendments.json.

CREATE TABLE IF NOT EXISTS wlt_settlement_policies (
  partner_id text PRIMARY KEY,
  fee_basis_points integer NOT NULL CHECK (fee_basis_points BETWEEN 0 AND 10000),
  currency text NOT NULL DEFAULT 'YER' CHECK (btrim(currency) <> ''),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  updated_by_operator_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS wlt_settlement_source_orders (
  order_id text PRIMARY KEY,
  settlement_id text NOT NULL REFERENCES wlt_settlements(id) ON DELETE RESTRICT,
  partner_id text NOT NULL,
  gross_amount_minor_units bigint NOT NULL CHECK (gross_amount_minor_units > 0),
  currency text NOT NULL CHECK (btrim(currency) <> ''),
  delivered_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_settlement_source_orders_settlement_idx
  ON wlt_settlement_source_orders (settlement_id, order_id);
CREATE INDEX IF NOT EXISTS wlt_settlement_source_orders_partner_period_idx
  ON wlt_settlement_source_orders (partner_id, delivered_at DESC);

COMMENT ON TABLE wlt_settlement_policies IS
  'WLT-owned partner fee policy in basis points. No implicit platform fee exists.';
COMMENT ON TABLE wlt_settlement_source_orders IS
  'Immutable delivered DSH order sources. order_id uniqueness prevents double settlement.';
