-- Verifies the central catalog seed and the dsh-036 runtime closure converged
-- correctly. Prints one row per check with a boolean pass column, then a DO
-- block re-evaluates the same checks and RAISEs (non-zero psql exit) if any
-- check is FALSE — so runtime:seed and CI fail automatically instead of only
-- printing results.
CREATE OR REPLACE TEMP VIEW central_catalog_checks AS
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
-- dsh-036 corrective closure: the permanent legacy archive exists and every
-- archived row is well-formed. On a fresh database the archive is simply
-- empty; the row-count equality gates live inside dsh-036 itself, where the
-- source tables still exist.
SELECT 'legacy_archive_table_exists', to_regclass('public.dsh_catalog_legacy_archive') IS NOT NULL
UNION ALL
SELECT 'legacy_audit_archived', NOT EXISTS (
  SELECT 1 FROM dsh_catalog_legacy_archive
  WHERE source_table = 'dsh_catalog_audit' AND (payload_json IS NULL OR source_id = '')
)
UNION ALL
SELECT 'legacy_revisions_archived', NOT EXISTS (
  SELECT 1 FROM dsh_catalog_legacy_archive
  WHERE source_table = 'dsh_catalog_revisions' AND (payload_json IS NULL OR source_id = '')
)
UNION ALL
SELECT 'legacy_media_assets_preserved',
  to_regclass('public.dsh_catalog_media') IS NULL
  AND NOT EXISTS (SELECT 1 FROM dsh_catalog_assets WHERE object_key = '' OR mime_type = '')
  AND (SELECT COUNT(*) FROM dsh_catalog_assets WHERE uploaded_by = 'system-migration')
      >= (SELECT COUNT(*) FROM dsh_catalog_legacy_archive
          WHERE source_table = 'dsh_catalog_media' AND payload_json->>'state' <> 'deleted')
UNION ALL
SELECT 'legacy_media_links_valid', NOT EXISTS (
  SELECT 1 FROM dsh_catalog_asset_links l
  WHERE l.entity_id IS NULL
     OR l.entity_id = ''
     OR (l.entity_type = 'master_product'
         AND NOT EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = l.entity_id))
)
UNION ALL
SELECT 'cart_items_fully_mapped', NOT EXISTS (
  SELECT 1
  FROM dsh_cart_items ci
  JOIN dsh_carts c ON c.id = ci.cart_id
  WHERE ci.store_assortment_id IS NULL
    AND EXISTS (
      SELECT 1 FROM dsh_store_assortments a
      WHERE a.store_id = c.store_id AND a.master_product_id = ci.product_id
    )
)
UNION ALL
SELECT 'no_orphan_assortments', NOT EXISTS (
  SELECT 1 FROM dsh_store_assortments a
  WHERE NOT EXISTS (SELECT 1 FROM dsh_master_products mp WHERE mp.id = a.master_product_id)
     OR NOT EXISTS (SELECT 1 FROM dsh_stores s WHERE s.id = a.store_id)
)
UNION ALL
SELECT 'no_orphan_asset_links', NOT EXISTS (
  SELECT 1 FROM dsh_catalog_asset_links l
  WHERE NOT EXISTS (SELECT 1 FROM dsh_catalog_assets a WHERE a.id = l.asset_id)
)
UNION ALL
SELECT 'local_catalog_tables_removed',
  to_regclass('public.dsh_catalog_categories') IS NULL
  AND to_regclass('public.dsh_catalog_products') IS NULL
  AND to_regclass('public.dsh_catalog_media') IS NULL
  AND to_regclass('public.dsh_categories') IS NULL
  AND to_regclass('public.dsh_catalog_audit') IS NULL
  AND to_regclass('public.dsh_catalog_revisions') IS NULL
UNION ALL
SELECT 'local_store_category_columns_removed', NOT EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'dsh_stores'
    AND column_name IN ('category', 'category_id')
);

SELECT check_name, pass FROM central_catalog_checks;

DO $verify$
DECLARE
  v_failed TEXT;
BEGIN
  SELECT string_agg(check_name, ', ') INTO v_failed
  FROM central_catalog_checks
  WHERE pass IS DISTINCT FROM TRUE;
  IF v_failed IS NOT NULL THEN
    RAISE EXCEPTION 'central catalog verification FAILED: %', v_failed;
  END IF;
  RAISE NOTICE 'central catalog verification: all checks passed';
END
$verify$;

DROP VIEW IF EXISTS central_catalog_checks;
