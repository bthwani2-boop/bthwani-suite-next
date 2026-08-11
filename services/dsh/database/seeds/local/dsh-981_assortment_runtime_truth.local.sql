-- Local-only convergence of seeded assortments onto the normalized runtime
-- inventory/pricing authority introduced by dsh-980. Migrations execute before
-- local fixture seeds, so the historical migration backfill cannot see rows
-- inserted later by dsh-032/dsh-960. This seed closes that ordering boundary
-- explicitly; product code continues to fail closed when normalized truth is
-- absent.

-- Seed-owned inventory is deterministic. Runtime/operator-created assortment
-- inventory is never touched here.
INSERT INTO dsh_store_assortment_inventory (
  store_assortment_id,
  policy_type,
  quantity,
  reserved_quantity,
  min_order_quantity,
  max_order_quantity,
  step_quantity,
  version,
  created_at,
  updated_at
)
SELECT
  a.id,
  'signal',
  CASE
    WHEN a.available IS NOT TRUE OR a.stock_status = 'out_of_stock' THEN 0
    WHEN a.stock_status = 'low_stock' THEN 5
    ELSE 100
  END,
  0,
  1,
  100,
  1,
  1,
  NOW(),
  NOW()
FROM dsh_store_assortments a
WHERE a.submitted_by = 'system-seed'
ON CONFLICT (store_assortment_id) DO UPDATE SET
  policy_type = 'signal',
  quantity = EXCLUDED.quantity,
  reserved_quantity = 0,
  min_order_quantity = 1,
  max_order_quantity = 100,
  step_quantity = 1,
  version = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM 'signal'
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM 0
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM 1
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM 100
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM 1
    THEN dsh_store_assortment_inventory.version + 1
    ELSE dsh_store_assortment_inventory.version
  END,
  updated_at = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM 'signal'
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM 0
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM 1
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM 100
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM 1
    THEN NOW()
    ELSE dsh_store_assortment_inventory.updated_at
  END;

-- Fixture pricing is one non-overlapping current schedule per seed-owned
-- assortment. Remove only seed/migration bootstrap schedules for these fixture
-- rows; never touch actor-created assortments or their schedules.
DELETE FROM dsh_store_assortment_prices p
USING dsh_store_assortments a
WHERE p.store_assortment_id = a.id
  AND a.submitted_by = 'system-seed'
  AND (p.id = 'price-' || a.id OR p.id = 'local-price-' || a.id);

INSERT INTO dsh_store_assortment_prices (
  id,
  store_assortment_id,
  amount_minor,
  currency,
  prep_time_min,
  prep_time_max,
  effective_from,
  effective_until,
  version,
  created_at,
  updated_at
)
SELECT
  'local-price-' || a.id,
  a.id,
  ROUND(a.unit_price * 100)::INTEGER,
  UPPER(a.currency),
  15,
  30,
  a.created_at,
  NULL,
  1,
  NOW(),
  NOW()
FROM dsh_store_assortments a
WHERE a.submitted_by = 'system-seed'
  AND a.unit_price > 0
  AND length(trim(a.currency)) = 3;

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM dsh_store_assortments a
  WHERE a.submitted_by = 'system-seed'
    AND a.publication_status = 'client_visible'
    AND a.available = TRUE
    AND NOT EXISTS (
      SELECT 1
      FROM dsh_store_assortment_inventory i
      JOIN LATERAL (
        SELECT p.amount_minor, p.currency
        FROM dsh_store_assortment_prices p
        WHERE p.store_assortment_id = i.store_assortment_id
          AND p.effective_from <= NOW()
          AND (p.effective_until IS NULL OR p.effective_until > NOW())
        ORDER BY p.effective_from DESC, p.version DESC, p.id DESC
        LIMIT 1
      ) current_price ON TRUE
      WHERE i.store_assortment_id = a.id
        AND current_price.amount_minor > 0
        AND length(trim(current_price.currency)) = 3
        AND (
          i.policy_type = 'infinite'
          OR (i.policy_type = 'signal' AND i.quantity > 0)
          OR (
            i.policy_type = 'quantity'
            AND (i.quantity - i.reserved_quantity) >= GREATEST(i.min_order_quantity, 1)
            AND i.max_order_quantity >= GREATEST(i.min_order_quantity, 1)
            AND i.step_quantity >= 1
          )
        )
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'DSH_LOCAL_ASSORTMENT_RUNTIME_TRUTH_INVALID: % client-visible seed assortments are not purchasable', invalid_count;
  END IF;
END;
$$;
