-- Local-only DSH seed contract.
-- Runs only after the canonical seed runner has completed.

DO $$
DECLARE
  published_storefront_count INTEGER;
BEGIN
  IF to_regclass('public.runtime_seed_runs') IS NULL THEN
    RAISE EXCEPTION 'runtime_seed_runs ledger is missing';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM runtime_seed_runs) THEN
    RAISE EXCEPTION 'runtime_seed_runs contains no executed local seeds';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM runtime_seed_runs
    WHERE checksum !~ '^[0-9a-f]{64}$'
       OR run_count < 1
  ) THEN
    RAISE EXCEPTION 'runtime_seed_runs contains an invalid checksum or run count';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_stores
    WHERE id = 'store-test-grocery'
      AND tenant_id = 'local-dsh'
  ) THEN
    RAISE EXCEPTION 'canonical local grocery store seed is missing or tenant ownership drifted';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM dsh_partners
    WHERE id = 'prt_partner_local_001'
      AND tenant_id = 'local-dsh'
  ) THEN
    RAISE EXCEPTION 'canonical local partner seed is missing or tenant ownership drifted';
  END IF;

  IF EXISTS (
    SELECT 1 FROM dsh_stores
    WHERE tenant_id IS NULL OR btrim(tenant_id) = ''
  ) THEN
    RAISE EXCEPTION 'local store seeds created unowned tenant rows';
  END IF;

  IF EXISTS (
    SELECT 1 FROM dsh_partners
    WHERE tenant_id IS NULL OR btrim(tenant_id) = ''
  ) THEN
    RAISE EXCEPTION 'local partner seeds created unowned tenant rows';
  END IF;

  SELECT COUNT(*)
  INTO published_storefront_count
  FROM dsh_stores s
  JOIN dsh_partners partner ON partner.id = s.partner_id
  WHERE s.tenant_id = 'local-dsh'
    AND s.id IN (
      'store-test-grocery',
      'store-1002',
      'store-1003',
      'store-1005',
      'store-1006',
      'store-test-electronics'
    )
    AND s.is_visible = true
    AND s.status = 'active'
    AND s.serviceability_status IN ('serviceable', 'limited')
    AND s.partner_readiness = 'ready'
    AND s.catalog_approval_status = 'approved'
    AND s.marketing_visibility = 'visible'
    AND cardinality(s.delivery_modes) > 0
    AND btrim(COALESCE(s.address_line, '')) <> ''
    AND btrim(COALESCE(s.coverage_summary, '')) <> ''
    AND btrim(COALESCE(s.operating_hours, '')) <> ''
    AND s.delivery_readiness = 'ready'
    AND btrim(COALESCE(s.hero_image_url, '')) <> ''
    AND btrim(COALESCE(s.logo_url, '')) <> ''
    AND partner.activation_status = 'client_visible'
    AND partner.archived_at IS NULL
    AND EXISTS (
      SELECT 1
      FROM dsh_store_assortments assortment
      JOIN dsh_master_products product
        ON product.id = assortment.master_product_id
      JOIN dsh_catalog_domains domain
        ON domain.id = product.domain_id
      JOIN dsh_store_catalog_domains store_domain
        ON store_domain.store_id = assortment.store_id
       AND store_domain.domain_id = product.domain_id
      WHERE assortment.store_id = s.id
        AND assortment.publication_status = 'client_visible'
        AND assortment.available = true
        AND product.approval_status = 'approved'
        AND product.is_active = true
        AND domain.is_active = true
        AND domain.is_client_visible = true
        AND store_domain.status = 'approved'
    );

  IF published_storefront_count <> 6 THEN
    RAISE EXCEPTION 'expected 6 complete local client storefronts, found %', published_storefront_count;
  END IF;
END
$$;
