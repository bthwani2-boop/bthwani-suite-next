-- DSH-1077: cut the store-assortment commercial dual truth over to the
-- normalized inventory and price resources.
--
-- This migration is intentionally destructive only after an atomic, explicit
-- proof that every assortment has complete and valid normalized rows and that
-- the rows preserve the legacy commercial values. A failed proof rolls back
-- the backfill and leaves the legacy columns available for remediation.

BEGIN;

DO $dsh1077_backfill_and_gate$
DECLARE
  v_bad BIGINT;
BEGIN
  IF to_regclass('public.dsh_store_assortments') IS NULL
     OR to_regclass('public.dsh_store_assortment_inventory') IS NULL
     OR to_regclass('public.dsh_store_assortment_prices') IS NULL THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_TABLES_REQUIRED';
  END IF;

  -- Rows created before dsh-980 or after its historical backfill are filled
  -- once. Existing normalized rows are never overwritten by this cutover.
  INSERT INTO dsh_store_assortment_inventory (
    store_assortment_id,
    policy_type,
    quantity,
    reserved_quantity,
    min_order_quantity,
    max_order_quantity,
    step_quantity,
    version,
    created_at,
    updated_at
  )
  SELECT
    a.id,
    'signal',
    CASE
      WHEN a.available IS NOT TRUE OR a.stock_status = 'out_of_stock' THEN 0
      WHEN a.stock_status = 'low_stock' THEN 5
      ELSE 100
    END,
    0,
    1,
    100,
    1,
    1,
    a.created_at,
    NOW()
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_inventory i
    WHERE i.store_assortment_id = a.id
  );

  INSERT INTO dsh_store_assortment_prices (
    id,
    store_assortment_id,
    amount_minor,
    currency,
    prep_time_min,
    prep_time_max,
    effective_from,
    effective_until,
    version,
    created_at,
    updated_at
  )
  SELECT
    'cutover-price-' || a.id,
    a.id,
    ROUND(a.unit_price * 100)::INTEGER,
    UPPER(BTRIM(a.currency)),
    0,
    0,
    a.created_at,
    NULL,
    1,
    a.created_at,
    NOW()
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_prices p
    WHERE p.store_assortment_id = a.id
  );

  SELECT COUNT(*)
  INTO v_bad
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_inventory i
    WHERE i.store_assortment_id = a.id
  );
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_INVENTORY_INCOMPLETE: % assortments have no inventory row', v_bad;
  END IF;

  SELECT COUNT(*)
  INTO v_bad
  FROM dsh_store_assortment_inventory i
  JOIN dsh_store_assortments a ON a.id = i.store_assortment_id
  WHERE i.policy_type NOT IN ('signal', 'quantity', 'infinite')
     OR i.quantity < 0
     OR i.reserved_quantity < 0
     OR i.reserved_quantity > i.quantity
     OR i.min_order_quantity < 1
     OR i.max_order_quantity < i.min_order_quantity
     OR i.step_quantity < 1
     OR i.version < 1;
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_INVENTORY_INVALID: % rows failed validation', v_bad;
  END IF;

  SELECT COUNT(*)
  INTO v_bad
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_prices p
    WHERE p.store_assortment_id = a.id
      AND p.amount_minor >= 0
      AND length(BTRIM(p.currency)) = 3
      AND BTRIM(p.currency) = UPPER(BTRIM(p.currency))
      AND p.effective_from IS NOT NULL
      AND (p.effective_until IS NULL OR p.effective_until > p.effective_from)
      AND p.version >= 1
  );
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_PRICE_INCOMPLETE: % assortments have no valid price row', v_bad;
  END IF;

  -- Any pre-existing normalized row whose effective semantics disagree with
  -- the legacy snapshot blocks the cutover instead of silently choosing one
  -- of two truths. Policy type is deliberately not compared: `quantity` and
  -- `signal` can represent the same legacy in-stock projection, while the
  -- normalized policy remains the authoritative operational choice.
  SELECT COUNT(*)
  INTO v_bad
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_inventory i
    WHERE i.store_assortment_id = a.id
      AND (CASE
        WHEN a.paused_at IS NOT NULL THEN FALSE
        WHEN i.policy_type = 'infinite' THEN TRUE
        WHEN i.policy_type = 'signal' THEN i.quantity > 0
        WHEN i.policy_type = 'quantity' THEN i.quantity - i.reserved_quantity >= i.min_order_quantity
        ELSE FALSE
      END) IS NOT DISTINCT FROM (a.available IS TRUE)
      AND (CASE
        WHEN a.paused_at IS NOT NULL THEN 'out_of_stock'
        WHEN i.policy_type = 'infinite' THEN 'in_stock'
        WHEN i.policy_type = 'signal' AND i.quantity > 0 AND i.quantity <= 5 THEN 'low_stock'
        WHEN i.policy_type = 'signal' AND i.quantity > 5 THEN 'in_stock'
        WHEN i.policy_type = 'quantity' AND i.quantity - i.reserved_quantity >= i.min_order_quantity
          AND i.quantity - i.reserved_quantity <= 5 THEN 'low_stock'
        WHEN i.policy_type = 'quantity' AND i.quantity - i.reserved_quantity > 5 THEN 'in_stock'
        ELSE 'out_of_stock'
      END) IS NOT DISTINCT FROM a.stock_status
  );
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_INVENTORY_MISMATCH: % assortments disagree with the legacy snapshot', v_bad;
  END IF;

  SELECT COUNT(*)
  INTO v_bad
  FROM dsh_store_assortments a
  WHERE NOT EXISTS (
    SELECT 1
    FROM dsh_store_assortment_prices p
    WHERE p.store_assortment_id = a.id
      AND p.amount_minor = ROUND(a.unit_price * 100)::INTEGER
      AND p.currency = UPPER(BTRIM(a.currency))
  );
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'DSH1077_NORMALIZED_PRICE_MISMATCH: % assortments disagree with the legacy snapshot', v_bad;
  END IF;
END
$dsh1077_backfill_and_gate$;

-- The readiness view and rollback routine are live database objects. Replace
-- their legacy-column dependencies before the columns are removed.
DROP VIEW IF EXISTS dsh_partner_store_readiness_v;

CREATE OR REPLACE FUNCTION dsh_catalog_rollback_audit(
  p_audit_id TEXT,
  p_actor_id TEXT,
  p_actor_role TEXT,
  p_reason TEXT,
  p_expected_version INTEGER
)
RETURNS TABLE (entity_type TEXT, entity_id TEXT, new_version INTEGER)
LANGUAGE plpgsql
AS $dsh1077_rollback$
DECLARE
  v_audit dsh_catalog_entity_audit%ROWTYPE;
  v_current_version INTEGER;
BEGIN
  IF BTRIM(COALESCE(p_actor_id, '')) = '' OR BTRIM(COALESCE(p_reason, '')) = '' OR p_expected_version IS NULL THEN
    RAISE EXCEPTION 'INVALID_ROLLBACK_REQUEST';
  END IF;

  SELECT * INTO v_audit
  FROM dsh_catalog_entity_audit
  WHERE id = p_audit_id
  FOR UPDATE;

  IF NOT FOUND OR v_audit.action <> 'UPDATE' OR v_audit.before_json IS NULL THEN
    RAISE EXCEPTION 'AUDIT_ENTRY_NOT_ROLLBACKABLE';
  END IF;

  PERFORM set_config('bthwani.actor_id', p_actor_id, TRUE);
  PERFORM set_config('bthwani.actor_role', COALESCE(NULLIF(p_actor_role, ''), 'operator'), TRUE);
  PERFORM set_config('bthwani.change_reason', p_reason, TRUE);

  CASE v_audit.entity_type
    WHEN 'dsh_catalog_domains' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_domains WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_domains SET
        name_ar = v_audit.before_json->>'name_ar',
        name_en = v_audit.before_json->>'name_en',
        icon = v_audit.before_json->>'icon',
        sort_order = (v_audit.before_json->>'sort_order')::INTEGER,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        is_client_visible = (v_audit.before_json->>'is_client_visible')::BOOLEAN,
        requires_product_catalog = (v_audit.before_json->>'requires_product_catalog')::BOOLEAN,
        is_manual_request = (v_audit.before_json->>'is_manual_request')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_catalog_nodes' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_nodes WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_nodes SET
        name_ar = v_audit.before_json->>'name_ar',
        name_en = v_audit.before_json->>'name_en',
        icon = v_audit.before_json->>'icon',
        sort_order = (v_audit.before_json->>'sort_order')::INTEGER,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        is_client_visible = (v_audit.before_json->>'is_client_visible')::BOOLEAN,
        requires_barcode = (v_audit.before_json->>'requires_barcode')::BOOLEAN,
        allows_product_proposal = (v_audit.before_json->>'allows_product_proposal')::BOOLEAN,
        allows_store_product_custom_image = (v_audit.before_json->>'allows_store_product_custom_image')::BOOLEAN,
        requires_catalog_review = (v_audit.before_json->>'requires_catalog_review')::BOOLEAN,
        requires_product_catalog = (v_audit.before_json->>'requires_product_catalog')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_master_products' THEN
      SELECT version INTO v_current_version FROM dsh_master_products WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_master_products SET
        category_node_id = NULLIF(v_audit.before_json->>'category_node_id', ''),
        canonical_name_ar = v_audit.before_json->>'canonical_name_ar',
        canonical_name_en = v_audit.before_json->>'canonical_name_en',
        brand = v_audit.before_json->>'brand',
        barcode = NULLIF(v_audit.before_json->>'barcode', ''),
        gtin = NULLIF(v_audit.before_json->>'gtin', ''),
        sku = NULLIF(v_audit.before_json->>'sku', ''),
        unit = v_audit.before_json->>'unit',
        measurement_type = v_audit.before_json->>'measurement_type',
        approval_status = v_audit.before_json->>'approval_status',
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_store_assortments' THEN
      SELECT version INTO v_current_version FROM dsh_store_assortments WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      -- Assortment rollback owns metadata only. Commercial rollback is owned by
      -- the normalized inventory/price audit entries after this cutover.
      UPDATE dsh_store_assortments SET
        local_note = v_audit.before_json->>'local_note',
        custom_image_object_key = NULLIF(v_audit.before_json->>'custom_image_object_key', ''),
        publication_status = v_audit.before_json->>'publication_status',
        pause_reason = COALESCE(v_audit.before_json->>'pause_reason', ''),
        paused_until = NULLIF(v_audit.before_json->>'paused_until', '')::TIMESTAMPTZ,
        paused_at = NULLIF(v_audit.before_json->>'paused_at', '')::TIMESTAMPTZ,
        paused_by = NULLIF(v_audit.before_json->>'paused_by', ''),
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    WHEN 'dsh_catalog_platform_policies' THEN
      SELECT version INTO v_current_version FROM dsh_catalog_platform_policies WHERE id = v_audit.entity_id FOR UPDATE;
      IF v_current_version <> p_expected_version THEN RAISE EXCEPTION 'ROLLBACK_VERSION_CONFLICT'; END IF;
      UPDATE dsh_catalog_platform_policies SET
        allows_store_product_custom_image = (v_audit.before_json->>'allows_store_product_custom_image')::BOOLEAN,
        allows_product_proposal = (v_audit.before_json->>'allows_product_proposal')::BOOLEAN,
        requires_barcode = (v_audit.before_json->>'requires_barcode')::BOOLEAN,
        requires_catalog_review = (v_audit.before_json->>'requires_catalog_review')::BOOLEAN,
        requires_marketing_review = (v_audit.before_json->>'requires_marketing_review')::BOOLEAN,
        requires_product_image = (v_audit.before_json->>'requires_product_image')::BOOLEAN,
        requires_category_image = (v_audit.before_json->>'requires_category_image')::BOOLEAN,
        requires_description = (v_audit.before_json->>'requires_description')::BOOLEAN,
        requires_brand = (v_audit.before_json->>'requires_brand')::BOOLEAN,
        requires_unit = (v_audit.before_json->>'requires_unit')::BOOLEAN,
        product_data_quality_minimum_score = (v_audit.before_json->>'product_data_quality_minimum_score')::NUMERIC,
        max_gallery_images = (v_audit.before_json->>'max_gallery_images')::INTEGER,
        manual_request_mode = (v_audit.before_json->>'manual_request_mode')::BOOLEAN,
        is_active = (v_audit.before_json->>'is_active')::BOOLEAN,
        notes = v_audit.before_json->>'notes',
        version = v_current_version + 1,
        updated_at = NOW()
      WHERE id = v_audit.entity_id;

    ELSE
      RAISE EXCEPTION 'AUDIT_ENTITY_NOT_ROLLBACKABLE';
  END CASE;

  INSERT INTO dsh_catalog_entity_audit (
    id, entity_type, entity_id, action, actor_id, actor_role, reason,
    before_json, after_json, metadata_json
  ) VALUES (
    'catalog-audit-' || gen_random_uuid()::text,
    v_audit.entity_type,
    v_audit.entity_id,
    'ROLLBACK',
    p_actor_id,
    COALESCE(NULLIF(p_actor_role, ''), 'operator'),
    p_reason,
    v_audit.after_json,
    v_audit.before_json,
    jsonb_build_object('sourceAuditId', p_audit_id)
  );

  RETURN QUERY SELECT v_audit.entity_type, v_audit.entity_id, v_current_version + 1;
END
$dsh1077_rollback$;

DROP TRIGGER IF EXISTS trg_dsh_store_assortments_pause_restore_state ON dsh_store_assortments;
DROP FUNCTION IF EXISTS dsh_assortment_sync_pause_restore_state();
DROP INDEX IF EXISTS idx_dsh_store_assortments_client_visible;

ALTER TABLE dsh_store_assortments
  DROP COLUMN IF EXISTS unit_price,
  DROP COLUMN IF EXISTS currency,
  DROP COLUMN IF EXISTS available,
  DROP COLUMN IF EXISTS stock_status,
  DROP COLUMN IF EXISTS available_before_pause;

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
      JOIN dsh_store_assortment_inventory inventory
        ON inventory.store_assortment_id = assortment.id
      JOIN dsh_master_products product ON product.id = assortment.master_product_id
      JOIN dsh_catalog_domains domain ON domain.id = product.domain_id
      JOIN dsh_store_catalog_domains store_domain
        ON store_domain.store_id = assortment.store_id
       AND store_domain.domain_id = product.domain_id
      JOIN LATERAL (
        SELECT price.amount_minor, price.currency
        FROM dsh_store_assortment_prices price
        WHERE price.store_assortment_id = assortment.id
          AND price.effective_from <= NOW()
          AND (price.effective_until IS NULL OR price.effective_until > NOW())
        ORDER BY price.effective_from DESC, price.version DESC, price.id DESC
        LIMIT 1
      ) current_price ON TRUE
      WHERE assortment.store_id = s.id
        AND assortment.publication_status = 'client_visible'
        AND current_price.amount_minor > 0
        AND length(BTRIM(current_price.currency)) = 3
        AND (
          inventory.policy_type = 'infinite'
          OR (inventory.quantity - inventory.reserved_quantity) >= GREATEST(inventory.min_order_quantity, 1)
        )
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
      CASE WHEN delivery_readiness <> 'ready' THEN 'DELIVERY_NOT_READY' END
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
