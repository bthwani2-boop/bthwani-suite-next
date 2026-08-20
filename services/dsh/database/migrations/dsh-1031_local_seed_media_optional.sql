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
  s.id AS store_id,
  s.partner_id,
  (
    s.partner_readiness = 'ready'
    AND s.catalog_approval_status = 'approved'
    AND s.marketing_visibility = 'visible'
    AND cardinality(s.delivery_modes) > 0
    AND NULLIF(btrim(s.address_line), '') IS NOT NULL
    AND NULLIF(btrim(s.coverage_summary), '') IS NOT NULL
    AND NULLIF(btrim(s.operating_hours), '') IS NOT NULL
    AND s.delivery_readiness = 'ready'
  ) AS is_fully_ready,
  CASE
    WHEN s.partner_readiness = 'blocked'
      OR s.catalog_approval_status = 'rejected'
      OR s.marketing_visibility = 'blocked'
      OR s.delivery_readiness = 'blocked'
      OR COALESCE(p.activation_status, 'pending') IN ('suspended', 'revoked')
      THEN 'blocked'
    WHEN s.partner_readiness = 'ready'
      AND s.catalog_approval_status = 'approved'
      AND s.marketing_visibility = 'visible'
      AND cardinality(s.delivery_modes) > 0
      AND NULLIF(btrim(s.address_line), '') IS NOT NULL
      AND NULLIF(btrim(s.coverage_summary), '') IS NOT NULL
      AND NULLIF(btrim(s.operating_hours), '') IS NOT NULL
      AND s.delivery_readiness = 'ready'
      THEN 'ready'
    ELSE 'incomplete'
  END AS readiness_state,
  ARRAY_REMOVE(ARRAY[
    CASE
      WHEN p.id IS NULL OR p.archived_at IS NOT NULL
        OR COALESCE(p.activation_status, 'pending') <> 'client_visible'
        THEN 'partner_activation'
    END,
    CASE WHEN s.partner_readiness <> 'ready' THEN 'partner_readiness' END,
    CASE WHEN s.catalog_approval_status <> 'approved' THEN 'catalog_approval' END,
    CASE WHEN s.marketing_visibility <> 'visible' THEN 'marketing_visibility' END,
    CASE WHEN cardinality(s.delivery_modes) = 0 THEN 'delivery_modes' END,
    CASE
      WHEN NULLIF(btrim(s.address_line), '') IS NULL
        OR NULLIF(btrim(s.coverage_summary), '') IS NULL
        OR NULLIF(btrim(s.operating_hours), '') IS NULL
        THEN 'operational_profile'
    END,
    CASE WHEN s.delivery_readiness <> 'ready' THEN 'delivery_readiness' END
  ], NULL) AS missing_requirements,
  s.updated_at
FROM dsh_stores s
LEFT JOIN dsh_partners p ON p.id = s.partner_id;
