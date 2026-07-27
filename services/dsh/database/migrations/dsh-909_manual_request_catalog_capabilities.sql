-- DSH-909: Sovereign manual-request catalog capabilities.
-- SHEIN and Awnak are client-visible service destinations in the same discovery
-- category list as catalog domains, but they never own a product catalog.

BEGIN;

INSERT INTO dsh_catalog_domains (
  id,
  slug,
  name_ar,
  name_en,
  icon,
  sort_order,
  is_active,
  is_client_visible,
  requires_product_catalog,
  is_manual_request
)
VALUES (
  'domain-manual-request',
  'manual_request',
  'طلب يدوي',
  'Manual Request',
  '📝',
  110,
  TRUE,
  TRUE,
  FALSE,
  TRUE
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  is_client_visible = TRUE,
  requires_product_catalog = FALSE,
  is_manual_request = TRUE,
  updated_at = NOW();

INSERT INTO dsh_catalog_nodes (
  id,
  domain_id,
  parent_id,
  level,
  slug,
  name_ar,
  name_en,
  icon,
  sort_order,
  is_active,
  is_client_visible,
  requires_barcode,
  allows_product_proposal,
  allows_store_product_custom_image,
  requires_catalog_review,
  requires_product_catalog
)
VALUES
  (
    'node-shein',
    'domain-manual-request',
    NULL,
    'BUSINESS_SUBDOMAIN',
    'shein',
    'شي إن',
    'SHEIN',
    '🛍️',
    10,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE
  ),
  (
    'node-awnak',
    'domain-manual-request',
    NULL,
    'BUSINESS_SUBDOMAIN',
    'awnak',
    'عونك',
    'Awnak',
    '🛵',
    20,
    TRUE,
    TRUE,
    FALSE,
    FALSE,
    FALSE,
    FALSE,
    FALSE
  )
ON CONFLICT (id) DO UPDATE SET
  domain_id = EXCLUDED.domain_id,
  parent_id = EXCLUDED.parent_id,
  level = EXCLUDED.level,
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  is_client_visible = TRUE,
  requires_barcode = FALSE,
  allows_product_proposal = FALSE,
  allows_store_product_custom_image = FALSE,
  requires_catalog_review = FALSE,
  requires_product_catalog = FALSE,
  updated_at = NOW();

COMMIT;
