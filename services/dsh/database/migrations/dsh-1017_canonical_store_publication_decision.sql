BEGIN;

DROP VIEW IF EXISTS dsh_partner_store_readiness_v;

CREATE VIEW dsh_partner_store_readiness_v AS
WITH gate_inputs AS (
  SELECT
    s.operator_context_id,
    s.partner_id,
    s.id AS store_id,
    s.display_name,
    s.status,
    s.is_visible,
    s.serviceability_status,
    s.partner_readiness,
    s.catalog_approval_status,
    s.marketing_visibility,
    s.delivery_modes,
    s.address_line,
    s.coverage_summary,
    s.operating_hours,
    s.delivery_readiness,
    s.hero_image_url,
    s.logo_url,
    EXISTS (
      SELECT 1
      FROM dsh_partners partner
      WHERE partner.id = s.partner_id
        AND partner.activation_status = 'client_visible'
        AND partner.archived_at IS NULL
    ) AS partner_client_visible,
    EXISTS (
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
    ) AS approved_assortment
  FROM dsh_stores s
  WHERE s.partner_id IS NOT NULL
), diagnosed AS (
  SELECT
    gate_inputs.*,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN status <> 'published' THEN 'STORE_NOT_PUBLISHED' END,
      CASE WHEN is_visible = FALSE THEN 'STORE_HIDDEN' END,
      CASE WHEN serviceability_status NOT IN ('serviceable', 'limited') THEN 'STORE_NOT_SERVICEABLE' END,
      CASE WHEN partner_readiness <> 'ready' THEN 'PARTNER_NOT_READY' END,
      CASE WHEN partner_client_visible = FALSE THEN 'PARTNER_NOT_CLIENT_VISIBLE' END,
      CASE WHEN catalog_approval_status <> 'approved' THEN 'CATALOG_NOT_APPROVED' END,
      CASE WHEN approved_assortment = FALSE THEN 'APPROVED_ASSORTMENT_MISSING' END,
      CASE WHEN marketing_visibility <> 'visible' THEN 'MARKETING_HIDDEN' END,
      CASE WHEN COALESCE(cardinality(delivery_modes), 0) = 0 THEN 'DELIVERY_MODES_MISSING' END,
      CASE WHEN btrim(COALESCE(address_line, '')) = '' THEN 'ADDRESS_MISSING' END,
      CASE WHEN btrim(COALESCE(coverage_summary, '')) = '' THEN 'COVERAGE_MISSING' END,
      CASE WHEN btrim(COALESCE(operating_hours, '')) = '' THEN 'OPERATING_HOURS_MISSING' END,
      CASE WHEN delivery_readiness <> 'ready' THEN 'DELIVERY_NOT_READY' END,
      CASE WHEN btrim(COALESCE(logo_url, '')) = '' THEN 'STORE_LOGO_MISSING' END,
      CASE WHEN btrim(COALESCE(hero_image_url, '')) = '' THEN 'STORE_COVER_MISSING' END
    ]::text[], NULL) AS blocking_reason_codes
  FROM gate_inputs
)
SELECT
  operator_context_id,
  partner_id,
  store_id,
  display_name,
  status,
  CASE WHEN cardinality(blocking_reason_codes) = 0 THEN 'PUBLISHED' ELSE 'BLOCKED' END AS publication_decision,
  blocking_reason_codes
FROM diagnosed;

COMMIT;
