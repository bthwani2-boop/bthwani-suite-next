-- LEGACY_FILENAME_ONLY — not a slice reference
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

INSERT INTO dsh_catalog_categories (id, store_id, name, description, sort_order, is_active)
VALUES
  ('catalog-cat-1001-grocery', 'store-1001', 'البقالة', 'احتياجات يومية', 1, true),
  ('catalog-cat-1005-meals', 'store-1005', 'الوجبات', 'وجبات المطعم', 1, true),
  ('catalog-cat-1005-grocery', 'store-1005', 'بقالة', 'فواكه وخضروات طازجة', 2, true),
  ('catalog-cat-1005-bakery', 'store-1005', 'مخبوزات', 'كرواسون وخبز طازج', 3, true),
  ('catalog-cat-1005-general', 'store-1005', 'عام', 'منتجات متنوعة', 4, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = true,
  updated_at = now();

INSERT INTO dsh_catalog_products
  (id, store_id, category_id, name, description, sku, price_reference, is_active)
VALUES
  ('product-1001-rice', 'store-1001', 'catalog-cat-1001-grocery', 'أرز بسمتي', 'عبوة 5 كجم', 'RICE-5KG', '18', true),
  ('product-1005-meal', 'store-1005', 'catalog-cat-1005-meals', 'وجبة المدينة', 'وجبة رئيسية', 'CITY-MEAL', '18', true),
  ('product-1005-croissant', 'store-1005', 'catalog-cat-1005-bakery', 'كرواسون زبدة طازج', 'طازج ومقرمش', 'CROISSANT-01', '5', true),
  ('product-1005-wheatbread', 'store-1005', 'catalog-cat-1005-bakery', 'خبز قمح كامل', 'صحي ومغذي', 'WHEATBREAD-01', '3', true),
  ('product-1005-milk', 'store-1005', 'catalog-cat-1005-general', 'حليب عضوي', 'حليب طازج كامل الدسم', 'ORGANIC-MILK', '11', true),
  ('product-1005-apple', 'store-1005', 'catalog-cat-1005-grocery', 'تفاح رويال غالا', 'تفاح أحمر طازج', 'ROYAL-GALA', '18', true)
ON CONFLICT (id) DO UPDATE SET
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_reference = EXCLUDED.price_reference,
  is_active = true,
  updated_at = now();

INSERT INTO dsh_catalog_media (id, store_id, product_id, object_key, content_type, state, public_url)
VALUES
  ('media-1005-meal', 'store-1005', 'product-1005-meal', 'product-1005-meal.png', 'image/png', 'complete', 'http://localhost:59000/dsh-media/product-1005-meal.png'),
  ('media-1005-croissant', 'store-1005', 'product-1005-croissant', 'product-1005-croissant.png', 'image/png', 'complete', 'http://localhost:59000/dsh-media/product-1005-croissant.png'),
  ('media-1005-wheatbread', 'store-1005', 'product-1005-wheatbread', 'product-1005-wheatbread.png', 'image/png', 'complete', 'http://localhost:59000/dsh-media/product-1005-wheatbread.png'),
  ('media-1005-milk', 'store-1005', 'product-1005-milk', 'product-1005-milk.png', 'image/png', 'complete', 'http://localhost:59000/dsh-media/product-1005-milk.png'),
  ('media-1005-apple', 'store-1005', 'product-1005-apple', 'product-1005-apple.png', 'image/png', 'complete', 'http://localhost:59000/dsh-media/product-1005-apple.png')
ON CONFLICT (id) DO UPDATE SET
  product_id = EXCLUDED.product_id,
  object_key = EXCLUDED.object_key,
  content_type = EXCLUDED.content_type,
  state = EXCLUDED.state,
  public_url = EXCLUDED.public_url,
  updated_at = now();

