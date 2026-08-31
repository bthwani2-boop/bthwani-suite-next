-- Local-only convergence of seeded assortments onto the normalized runtime
-- inventory and price authorities. This file is intentionally independent of
-- the metadata link: no commercial field is written to dsh_store_assortments.

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
VALUES
  ('assortment-store-test-grocery-rice', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1005-meal', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1002-croissant', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1002-wheatbread', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-test-grocery-milk', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-test-grocery-apple', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1003-rice', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-1006-pain-relief', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW()),
  ('assortment-store-electronics-phone', 'signal', 100, 0, 1, 100, 1, 1, NOW(), NOW())
ON CONFLICT (store_assortment_id) DO UPDATE SET
  policy_type = EXCLUDED.policy_type,
  quantity = EXCLUDED.quantity,
  reserved_quantity = EXCLUDED.reserved_quantity,
  min_order_quantity = EXCLUDED.min_order_quantity,
  max_order_quantity = EXCLUDED.max_order_quantity,
  step_quantity = EXCLUDED.step_quantity,
  version = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM EXCLUDED.policy_type
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM EXCLUDED.reserved_quantity
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM EXCLUDED.min_order_quantity
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM EXCLUDED.max_order_quantity
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM EXCLUDED.step_quantity
    THEN dsh_store_assortment_inventory.version + 1
    ELSE dsh_store_assortment_inventory.version
  END,
  updated_at = CASE
    WHEN dsh_store_assortment_inventory.policy_type IS DISTINCT FROM EXCLUDED.policy_type
      OR dsh_store_assortment_inventory.quantity IS DISTINCT FROM EXCLUDED.quantity
      OR dsh_store_assortment_inventory.reserved_quantity IS DISTINCT FROM EXCLUDED.reserved_quantity
      OR dsh_store_assortment_inventory.min_order_quantity IS DISTINCT FROM EXCLUDED.min_order_quantity
      OR dsh_store_assortment_inventory.max_order_quantity IS DISTINCT FROM EXCLUDED.max_order_quantity
      OR dsh_store_assortment_inventory.step_quantity IS DISTINCT FROM EXCLUDED.step_quantity
    THEN NOW()
    ELSE dsh_store_assortment_inventory.updated_at
  END;

DELETE FROM dsh_store_assortment_prices
WHERE id IN (
  'price-assortment-store-test-grocery-rice',
  'price-assortment-store-1005-meal',
  'price-assortment-store-1002-croissant',
  'price-assortment-store-1002-wheatbread',
  'price-assortment-store-test-grocery-milk',
  'price-assortment-store-test-grocery-apple',
  'price-assortment-store-1003-rice',
  'price-assortment-store-1006-pain-relief',
  'price-assortment-store-electronics-phone',
  'local-price-assortment-store-test-grocery-rice',
  'local-price-assortment-store-1005-meal',
  'local-price-assortment-store-1002-croissant',
  'local-price-assortment-store-1002-wheatbread',
  'local-price-assortment-store-test-grocery-milk',
  'local-price-assortment-store-test-grocery-apple',
  'local-price-assortment-store-1003-rice',
  'local-price-assortment-store-1006-pain-relief',
  'local-price-assortment-store-electronics-phone'
);

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
VALUES
  ('local-price-assortment-store-test-grocery-rice', 'assortment-store-test-grocery-rice', 1800000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1005-meal', 'assortment-store-1005-meal', 180000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1002-croissant', 'assortment-store-1002-croissant', 50000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1002-wheatbread', 'assortment-store-1002-wheatbread', 30000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-test-grocery-milk', 'assortment-store-test-grocery-milk', 110000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-test-grocery-apple', 'assortment-store-test-grocery-apple', 180000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1003-rice', 'assortment-store-1003-rice', 1820000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-1006-pain-relief', 'assortment-store-1006-pain-relief', 150000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW()),
  ('local-price-assortment-store-electronics-phone', 'assortment-store-electronics-phone', 12500000, 'YER', 15, 30, NOW(), NULL, 1, NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET
  amount_minor = EXCLUDED.amount_minor,
  currency = EXCLUDED.currency,
  prep_time_min = EXCLUDED.prep_time_min,
  prep_time_max = EXCLUDED.prep_time_max,
  effective_from = EXCLUDED.effective_from,
  effective_until = EXCLUDED.effective_until,
  version = dsh_store_assortment_prices.version + 1,
  updated_at = NOW();

DO $$
DECLARE
  invalid_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO invalid_count
  FROM dsh_store_assortment_inventory i
  WHERE i.store_assortment_id IN (
      'assortment-store-test-grocery-rice',
      'assortment-store-1005-meal',
      'assortment-store-1002-croissant',
      'assortment-store-1002-wheatbread',
      'assortment-store-test-grocery-milk',
      'assortment-store-test-grocery-apple',
      'assortment-store-1003-rice',
      'assortment-store-1006-pain-relief',
      'assortment-store-electronics-phone'
    )
    AND (
      i.policy_type NOT IN ('signal', 'quantity', 'infinite')
      OR i.quantity < 0
      OR i.reserved_quantity < 0
      OR i.reserved_quantity > i.quantity
      OR i.min_order_quantity < 1
      OR i.max_order_quantity < i.min_order_quantity
      OR i.step_quantity < 1
    );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'DSH_LOCAL_NORMALIZED_INVENTORY_INVALID: % seeded rows failed validation', invalid_count;
  END IF;

  SELECT COUNT(*)
  INTO invalid_count
  FROM (
    VALUES
      ('assortment-store-test-grocery-rice', 1800000),
      ('assortment-store-1005-meal', 180000),
      ('assortment-store-1002-croissant', 50000),
      ('assortment-store-1002-wheatbread', 30000),
      ('assortment-store-test-grocery-milk', 110000),
      ('assortment-store-test-grocery-apple', 180000),
      ('assortment-store-1003-rice', 1820000),
      ('assortment-store-1006-pain-relief', 150000),
      ('assortment-store-electronics-phone', 12500000)
  ) AS expected(store_assortment_id, amount_minor)
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_prices p
    WHERE p.store_assortment_id = expected.store_assortment_id
      AND p.amount_minor = expected.amount_minor
      AND p.currency = 'YER'
      AND p.effective_from IS NOT NULL
  );

  IF invalid_count <> 0 THEN
    RAISE EXCEPTION 'DSH_LOCAL_NORMALIZED_PRICE_INVALID: % seeded rows failed validation', invalid_count;
  END IF;
END;
$$;
