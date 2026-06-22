-- WLT-000: Financial reference tables (read-only display surface for DSH).
-- No mutation endpoints exist. These tables are populated by WLT internal processes only.

CREATE TABLE IF NOT EXISTS wlt_payment_status_refs (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id   text NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_payment_status_refs_status_chk
    CHECK (status IN ('pending', 'authorized', 'captured', 'failed', 'refunded', 'partially_refunded'))
);

CREATE INDEX IF NOT EXISTS wlt_payment_status_refs_order_id_idx
  ON wlt_payment_status_refs (order_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS wlt_settlement_status_refs (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id   text NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_settlement_status_refs_status_chk
    CHECK (status IN ('pending', 'processing', 'settled', 'failed'))
);

CREATE INDEX IF NOT EXISTS wlt_settlement_status_refs_order_id_idx
  ON wlt_settlement_status_refs (order_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS wlt_refund_status_refs (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  order_id   text NOT NULL,
  status     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_refund_status_refs_status_chk
    CHECK (status IN ('none', 'requested', 'approved', 'completed', 'rejected'))
);

CREATE INDEX IF NOT EXISTS wlt_refund_status_refs_order_id_idx
  ON wlt_refund_status_refs (order_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS wlt_wallet_refs (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  actor_id   text NOT NULL,
  actor_type text NOT NULL,
  status     text NOT NULL,
  currency   text NOT NULL DEFAULT 'YER',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_wallet_refs_status_chk
    CHECK (status IN ('active', 'suspended', 'frozen', 'closed')),
  CONSTRAINT wlt_wallet_refs_actor_type_chk
    CHECK (actor_type IN ('client', 'partner', 'captain', 'field'))
);

CREATE INDEX IF NOT EXISTS wlt_wallet_refs_actor_idx
  ON wlt_wallet_refs (actor_id, actor_type, updated_at DESC);
