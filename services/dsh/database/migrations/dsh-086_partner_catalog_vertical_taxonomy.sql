BEGIN;

INSERT INTO dsh_catalog_domains (
  id, slug, name_ar, name_en, icon, sort_order,
  is_active, is_client_visible, requires_product_catalog, is_manual_request
) VALUES (
  'domain-pharmacy', 'pharmacy', 'صيدلية', 'Pharmacy', 'health-retail', 35,
  TRUE, TRUE, TRUE, FALSE
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  name_ar = EXCLUDED.name_ar,
  name_en = EXCLUDED.name_en,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  is_client_visible = TRUE,
  requires_product_catalog = TRUE,
  is_manual_request = FALSE,
  updated_at = NOW();

INSERT INTO dsh_catalog_nodes (
  id, domain_id, parent_id, level, slug, name_ar, name_en, icon, sort_order,
  is_active, is_client_visible, requires_barcode, allows_product_proposal,
  allows_store_product_custom_image, requires_catalog_review, requires_product_catalog
) VALUES
  ('node-restaurants', 'domain-restaurants', NULL, 'BUSINESS_SUBDOMAIN',
   'restaurant-menu', 'قائمة المطعم', 'Restaurant Menu', 'restaurant', 10,
   TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE),
  ('node-pharmacy', 'domain-pharmacy', NULL, 'BUSINESS_SUBDOMAIN',
   'pharmacy-catalog', 'كتالوج الصيدلية', 'Pharmacy Catalog', 'health-retail', 10,
   TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE),
  ('node-electronics', 'domain-electronics', NULL, 'BUSINESS_SUBDOMAIN',
   'electronics-catalog', 'كتالوج الإلكترونيات', 'Electronics Catalog', 'devices', 10,
   TRUE, TRUE, FALSE, TRUE, FALSE, TRUE, TRUE)
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
  requires_barcode = EXCLUDED.requires_barcode,
  allows_product_proposal = TRUE,
  allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image,
  requires_catalog_review = TRUE,
  requires_product_catalog = TRUE,
  updated_at = NOW();

INSERT INTO dsh_catalog_platform_policies (
  id, node_id, policy_scope, allows_store_product_custom_image,
  allows_product_proposal, requires_barcode, requires_catalog_review,
  is_active, notes
) VALUES
  ('policy-node-restaurants', 'node-restaurants', 'node', TRUE, TRUE, FALSE, TRUE, TRUE,
   'Restaurant menu catalog policy.'),
  ('policy-node-pharmacy', 'node-pharmacy', 'node', FALSE, TRUE, FALSE, TRUE, TRUE,
   'Pharmacy catalog review policy.'),
  ('policy-node-electronics', 'node-electronics', 'node', FALSE, TRUE, FALSE, TRUE, TRUE,
   'Electronics catalog review policy.')
ON CONFLICT (id) DO UPDATE SET
  node_id = EXCLUDED.node_id,
  policy_scope = EXCLUDED.policy_scope,
  allows_store_product_custom_image = EXCLUDED.allows_store_product_custom_image,
  allows_product_proposal = EXCLUDED.allows_product_proposal,
  requires_barcode = EXCLUDED.requires_barcode,
  requires_catalog_review = EXCLUDED.requires_catalog_review,
  is_active = TRUE,
  notes = EXCLUDED.notes,
  updated_at = NOW();

COMMIT;
