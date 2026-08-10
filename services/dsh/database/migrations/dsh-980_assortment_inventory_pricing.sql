-- Migration: Assortment Inventory and Pricing
-- Journey: J035 (Inventory/Limits) & J036 (Effective Pricing)

-- 1. Create the inventory table
CREATE TABLE IF NOT EXISTS dsh_store_assortment_inventory (
  store_assortment_id   TEXT PRIMARY KEY REFERENCES dsh_store_assortments(id) ON DELETE CASCADE,
  policy_type           TEXT NOT NULL DEFAULT 'signal' CHECK (policy_type IN ('signal', 'quantity', 'infinite')),
  quantity              INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity     INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0 AND reserved_quantity <= quantity),
  min_order_quantity    INTEGER NOT NULL DEFAULT 1 CHECK (min_order_quantity >= 1),
  max_order_quantity    INTEGER NOT NULL DEFAULT 100 CHECK (max_order_quantity >= min_order_quantity),
  step_quantity         INTEGER NOT NULL DEFAULT 1 CHECK (step_quantity >= 1),
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed initial inventory data based on current dsh_store_assortments state
INSERT INTO dsh_store_assortment_inventory (store_assortment_id, policy_type, quantity, version)
SELECT
  id,
  'signal',
  CASE WHEN stock_status = 'in_stock' THEN 100 WHEN stock_status = 'low_stock' THEN 5 ELSE 0 END,
  1
FROM dsh_store_assortments
ON CONFLICT (store_assortment_id) DO NOTHING;


-- 2. Create the prices schedule table
CREATE TABLE IF NOT EXISTS dsh_store_assortment_prices (
  id                    TEXT PRIMARY KEY,
  store_assortment_id   TEXT NOT NULL REFERENCES dsh_store_assortments(id) ON DELETE CASCADE,
  amount_minor          INTEGER NOT NULL CHECK (amount_minor >= 0),
  currency              TEXT NOT NULL DEFAULT 'YER',
  prep_time_min         INTEGER NOT NULL DEFAULT 0 CHECK (prep_time_min >= 0),
  prep_time_max         INTEGER NOT NULL DEFAULT 0 CHECK (prep_time_max >= prep_time_min),
  effective_from        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until       TIMESTAMPTZ,
  version               INTEGER NOT NULL DEFAULT 1,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_store_assortment_prices_lookup
  ON dsh_store_assortment_prices (store_assortment_id, effective_from, effective_until);

-- Seed initial pricing data based on current dsh_store_assortments state
INSERT INTO dsh_store_assortment_prices (
  id, store_assortment_id, amount_minor, currency, prep_time_min, prep_time_max, effective_from, effective_until
)
SELECT
  'price-' || id,
  id,
  CAST(unit_price * 100 AS INTEGER),
  currency,
  15, -- default prep time 15m
  30,
  created_at,
  NULL
FROM dsh_store_assortments
ON CONFLICT (id) DO NOTHING;
