-- Verifies the central catalog seed converged correctly. Prints one row per
-- check with a boolean pass column; a human or CI script greps for `f` (fail).
SELECT 'domains_count_ge_12' AS check_name, (COUNT(*) >= 12) AS pass FROM dsh_catalog_domains
UNION ALL
SELECT 'domain_manual_request_exists', EXISTS (SELECT 1 FROM dsh_catalog_domains WHERE id = 'domain-manual-request')
UNION ALL
SELECT 'node_shay_in_exists', EXISTS (SELECT 1 FROM dsh_catalog_nodes WHERE id = 'node-shay-in')
UNION ALL
SELECT 'node_awnak_exists', EXISTS (SELECT 1 FROM dsh_catalog_nodes WHERE id = 'node-awnak')
UNION ALL
SELECT 'groceries_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-groceries') >= 6
UNION ALL
SELECT 'sweets_juices_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-sweets-juices') >= 3
UNION ALL
SELECT 'elegance_subdomains_exist', (SELECT COUNT(*) FROM dsh_catalog_nodes WHERE domain_id = 'domain-elegance') >= 3
UNION ALL
SELECT 'image_policies_exist', (SELECT COUNT(*) FROM dsh_catalog_platform_policies WHERE policy_scope IN ('node', 'domain')) >= 5
UNION ALL
SELECT 'default_policy_exists', EXISTS (SELECT 1 FROM dsh_catalog_platform_policies WHERE id = 'default-policy')
UNION ALL
SELECT 'pharmacy_domain_exists', EXISTS (SELECT 1 FROM dsh_catalog_domains WHERE id = 'domain-pharmacy')
UNION ALL
SELECT 'master_products_seeded', (SELECT COUNT(*) FROM dsh_master_products WHERE created_source = 'central-catalog-seed') >= 6
UNION ALL
SELECT 'store_assortments_seeded', (SELECT COUNT(*) FROM dsh_store_assortments WHERE submitted_by = 'system-seed') >= 6
UNION ALL
SELECT 'client_visible_products_exist', EXISTS (
  SELECT 1
  FROM dsh_store_assortments a
  JOIN dsh_master_products p ON p.id = a.master_product_id
  JOIN dsh_catalog_domains d ON d.id = p.domain_id
  JOIN dsh_stores s ON s.id = a.store_id
  WHERE a.publication_status = 'client_visible'
    AND a.available = TRUE
    AND a.unit_price > 0
    AND p.approval_status = 'approved'
    AND p.is_active = TRUE
    AND d.is_active = TRUE
    AND d.is_client_visible = TRUE
    AND s.status = 'active'
    AND s.is_visible = TRUE
)
UNION ALL
SELECT 'local_catalog_tables_removed',
  to_regclass('public.dsh_catalog_categories') IS NULL
  AND to_regclass('public.dsh_catalog_products') IS NULL
  AND to_regclass('public.dsh_catalog_media') IS NULL
  AND to_regclass('public.dsh_categories') IS NULL
UNION ALL
SELECT 'local_store_category_columns_removed', NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_stores'
    AND column_name IN ('category', 'category_id')
);
