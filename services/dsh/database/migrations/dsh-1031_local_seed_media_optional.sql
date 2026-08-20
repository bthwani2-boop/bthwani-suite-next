-- DSH-1031: make local seed media an optional runtime overlay.
--
-- Public store contracts already model hero/logo media as nullable, and the
-- canonical DAM remains the source of truth whenever media is present. The
-- runtime schema must therefore not turn machine-local seed media into a
-- prerequisite for publishing otherwise complete local storefront/catalog
-- data. Storage remains independently available for real uploads.
--
-- This migration is the final store-publication media boundary after the
-- existing dsh-1030 extension sequence, so no earlier alignment migration can
-- restore media-required publication gates.

ALTER TABLE dsh_stores
  ALTER COLUMN hero_image_url DROP NOT NULL,
  ALTER COLUMN logo_url DROP NOT NULL,
  ALTER COLUMN storefront_photo_ref DROP NOT NULL,
  ALTER COLUMN interior_photo_ref DROP NOT NULL,
  ALTER COLUMN signage_photo_ref DROP NOT NULL;

DROP INDEX IF EXISTS idx_dsh_stores_public_discovery_gate;
CREATE INDEX idx_dsh_stores_public_discovery_gate
  ON dsh_stores (is_visible, status, serviceability_status)
  WHERE is_visible = TRUE
    AND status = 'published'
    AND serviceability_status IN ('serviceable', 'limited')
    AND partner_readiness = 'ready'
    AND catalog_approval_status = 'approved'
    AND marketing_visibility = 'visible'
    AND cardinality(delivery_modes) > 0
    AND NULLIF(btrim(address_line), '') IS NOT NULL
    AND NULLIF(btrim(coverage_summary), '') IS NOT NULL
    AND NULLIF(btrim(operating_hours), '') IS NOT NULL
    AND delivery_readiness = 'ready';

DROP VIEW IF EXISTS dsh_partner_store_readiness_v;
CREATE OR REPLACE VIEW dsh_partner_store_readiness_v AS
SELECT
  s.operator_context_id,
  s.partner_id,
  s.id AS store_id,
  s.display_name,
  s.status,
  (
    s.is_visible = TRUE
    AND s.status = 'published'
    AND s.serviceability_status IN ('serviceable', 'limited')
    AND s.partner_readiness = 'ready'
    AND s.catalog_approval_status = 'approved'
    AND s.marketing_visibility = 'visible'
    AND COALESCE(cardinality(s.delivery_modes), 0) > 0
    AND btrim(COALESCE(s.address_line, '')) <> ''
    AND btrim(COALESCE(s.coverage_summary, '')) <> ''
    AND btrim(COALESCE(s.operating_hours, '')) <> ''
    AND s.delivery_readiness = 'ready'
    AND EXISTS (
      SELECT 1 FROM dsh_partners partner
      WHERE partner.id = s.partner_id
        AND partner.activation_status = 'client_visible'
        AND partner.archived_at IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM dsh_store_assortments assortment
      JOIN dsh_master_products product ON product.id = assortment.master_product_id
      JOIN dsh_catalog_domains domain ON domain.id = product.domain_id
      JOIN dsh_store_catalog_domains store_domain
        ON store_domain.store_id = assortment.store_id
       AND store_domain.domain_id = product.domain_id
      WHERE assortment.store_id = s.id
        AND assortment.publication_status = 'client_visible'
        AND assortment.available = TRUE
        AND product.approval_status = 'approved'
        AND product.is_active = TRUE
        AND domain.is_active = TRUE
        AND domain.is_client_visible = TRUE
        AND store_domain.status = 'approved'
    )
  ) AS is_visible,
  s.serviceability_status,
  s.partner_readiness,
  s.catalog_approval_status,
  s.marketing_visibility,
  (
    s.status = 'published'
    AND s.is_visible = TRUE
    AND s.serviceability_status IN ('serviceable', 'limited')
    AND s.partner_readiness = 'ready'
    AND s.catalog_approval_status = 'approved'
    AND s.marketing_visibility = 'visible'
    AND COALESCE(cardinality(s.delivery_modes), 0) > 0
    AND btrim(COALESCE(s.address_line, '')) <> ''
    AND btrim(COALESCE(s.coverage_summary, '')) <> ''
    AND btrim(COALESCE(s.operating_hours, '')) <> ''
    AND s.delivery_readiness = 'ready'
    AND EXISTS (
      SELECT 1
      FROM dsh_store_assortments assortment
      JOIN dsh_master_products product ON product.id = assortment.master_product_id
      JOIN dsh_catalog_domains domain ON domain.id = product.domain_id
      JOIN dsh_store_catalog_domains store_domain
        ON store_domain.store_id = assortment.store_id
       AND store_domain.domain_id = product.domain_id
      WHERE assortment.store_id = s.id
        AND assortment.publication_status = 'client_visible'
        AND assortment.available = TRUE
        AND product.approval_status = 'approved'
        AND product.is_active = TRUE
        AND domain.is_active = TRUE
        AND domain.is_client_visible = TRUE
        AND store_domain.status = 'approved'
    )
  ) AS store_gates_passed,
  ARRAY_REMOVE(ARRAY[
    CASE WHEN s.status <> 'published' THEN 'STORE_NOT_PUBLISHED' END,
    CASE WHEN s.is_visible = FALSE THEN 'STORE_HIDDEN' END,
    CASE WHEN s.serviceability_status NOT IN ('serviceable', 'limited') THEN 'STORE_NOT_SERVICEABLE' END,
    CASE WHEN s.partner_readiness <> 'ready' THEN 'PARTNER_READINESS_PENDING' END,
    CASE WHEN s.catalog_approval_status <> 'approved' THEN 'CATALOG_NOT_APPROVED' END,
    CASE WHEN s.marketing_visibility <> 'visible' THEN 'MARKETING_NOT_VISIBLE' END,
    CASE WHEN COALESCE(cardinality(s.delivery_modes), 0) = 0 THEN 'DELIVERY_MODES_MISSING' END,
    CASE WHEN btrim(COALESCE(s.address_line, '')) = '' THEN 'ADDRESS_MISSING' END,
    CASE WHEN btrim(COALESCE(s.coverage_summary, '')) = '' THEN 'COVERAGE_MISSING' END,
    CASE WHEN btrim(COALESCE(s.operating_hours, '')) = '' THEN 'OPERATING_HOURS_MISSING' END,
    CASE WHEN s.delivery_readiness <> 'ready' THEN 'DELIVERY_NOT_READY' END,
    CASE WHEN NOT EXISTS (
      SELECT 1
      FROM dsh_store_assortments assortment
      JOIN dsh_master_products product ON product.id = assortment.master_product_id
      JOIN dsh_catalog_domains domain ON domain.id = product.domain_id
      JOIN dsh_store_catalog_domains store_domain
        ON store_domain.store_id = assortment.store_id
       AND store_domain.domain_id = product.domain_id
      WHERE assortment.store_id = s.id
        AND assortment.publication_status = 'client_visible'
        AND assortment.available = TRUE
        AND product.approval_status = 'approved'
        AND product.is_active = TRUE
        AND domain.is_active = TRUE
        AND domain.is_client_visible = TRUE
        AND store_domain.status = 'approved'
    ) THEN 'APPROVED_ASSORTMENT_MISSING' END
  ], NULL) AS blocked_reason_codes
FROM dsh_stores s
WHERE s.partner_id IS NOT NULL;
