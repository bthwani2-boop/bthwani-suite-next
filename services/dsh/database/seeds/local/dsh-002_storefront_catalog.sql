UPDATE dsh_stores
SET partner_readiness = 'ready',
    catalog_approval_status = 'approved',
    marketing_visibility = 'visible'
WHERE id IN ('store-1001', 'store-1002', 'store-1003', 'store-1005', 'store-1006');

UPDATE dsh_stores
SET partner_readiness = 'blocked',
    catalog_approval_status = 'draft',
    marketing_visibility = 'hidden'
WHERE id = 'store-1004';

INSERT INTO dsh_catalog_categories (id, store_id, name, description, sort_order)
VALUES
  ('catalog-cat-1001-grocery', 'store-1001', 'البقالة', 'احتياجات يومية', 1),
  ('catalog-cat-1005-meals', 'store-1005', 'الوجبات', 'وجبات المطعم', 1)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

INSERT INTO dsh_catalog_products
  (id, store_id, category_id, name, description, sku, price_reference)
VALUES
  ('product-1001-rice', 'store-1001', 'catalog-cat-1001-grocery', 'أرز بسمتي', 'عبوة 5 كجم', 'RICE-5KG', 'price-ref-rice-5kg'),
  ('product-1005-meal', 'store-1005', 'catalog-cat-1005-meals', 'وجبة المدينة', 'وجبة رئيسية', 'CITY-MEAL', 'price-ref-city-meal')
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_reference = EXCLUDED.price_reference,
  is_active = true,
  updated_at = now();
