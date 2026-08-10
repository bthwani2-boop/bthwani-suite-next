-- DSH-999: restore the final runtime/schema contract after late historical
-- migrations reintroduced legacy checkout states and omitted runtime-owned
-- cart and partner-onboarding columns.

BEGIN;

-- Cart price truth is represented in integer minor units at runtime. Preserve
-- existing commercial snapshots by converting the legacy decimal column once;
-- zero remains an explicit unpriced sentinel that checkout rejects closed.
ALTER TABLE dsh_cart_items
  ADD COLUMN IF NOT EXISTS unit_price_minor BIGINT NOT NULL DEFAULT 0;

UPDATE dsh_cart_items
SET unit_price_minor = ROUND(unit_price * 100)::BIGINT
WHERE unit_price_minor = 0
  AND unit_price > 0;

ALTER TABLE dsh_cart_items
  DROP CONSTRAINT IF EXISTS dsh_cart_items_unit_price_minor_chk;
ALTER TABLE dsh_cart_items
  ADD CONSTRAINT dsh_cart_items_unit_price_minor_chk
  CHECK (unit_price_minor >= 0);

-- J050 is the sole checkout state vocabulary. dsh-910 was authored against
-- the retired pre-J050 states and accidentally replaced the canonical check.
ALTER TABLE dsh_checkout_intents
  DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

UPDATE dsh_checkout_intents SET state = 'draft'      WHERE state = 'pending';
UPDATE dsh_checkout_intents SET state = 'blocked'    WHERE state = 'wlt_handoff_failed';
UPDATE dsh_checkout_intents SET state = 'confirming' WHERE state IN ('payment_pending', 'wlt_outcome_unknown');
UPDATE dsh_checkout_intents SET state = 'confirmed'  WHERE state = 'payment_confirmed';
UPDATE dsh_checkout_intents SET state = 'cancelled'  WHERE state = 'payment_failed';

ALTER TABLE dsh_checkout_intents
  ALTER COLUMN state SET DEFAULT 'draft';
ALTER TABLE dsh_checkout_intents
  ADD CONSTRAINT dsh_checkout_intents_state_check
  CHECK (state IN (
    'draft', 'validating', 'ready', 'blocked',
    'confirming', 'confirmed', 'cancelled', 'expired'
  ));

DROP INDEX IF EXISTS idx_dsh_checkout_intents_reconciliation;
CREATE INDEX idx_dsh_checkout_intents_reconciliation
  ON dsh_checkout_intents(updated_at, operator_context_id)
  WHERE state = 'confirming' AND btrim(wlt_payment_session_id) <> '';

-- The order snapshot trigger was also authored against the retired checkout
-- vocabulary. Rebind its projection to the same canonical states so new COD
-- orders cannot begin with an artificial `unknown` payment projection.
CREATE OR REPLACE FUNCTION dsh_apply_order_truth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  checkout_row RECORD;
BEGIN
  SELECT ci.delivery_address_id, ci.delivery_address, ci.state, ci.payment_method,
         ci.wlt_payment_session_id, ci.updated_at
  INTO checkout_row
  FROM dsh_checkout_intents ci
  WHERE ci.id = NEW.checkout_intent_id
    AND ci.operator_context_id = NEW.operator_context_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout intent is outside order OperatorContext';
  END IF;

  NEW.order_number := COALESCE(NULLIF(NEW.order_number, ''),
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' ||
    UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 12)));
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id, ''), 'order:' || NEW.id::text);
  NEW.delivery_address_id := checkout_row.delivery_address_id;
  NEW.delivery_address_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'addressId', checkout_row.delivery_address_id,
    'formattedAddress', NULLIF(checkout_row.delivery_address, '')
  ));
  NEW.payment_status_projection := CASE
    WHEN checkout_row.state = 'confirmed' AND checkout_row.payment_method <> 'cod' THEN 'confirmed'
    WHEN checkout_row.payment_method = 'cod' AND checkout_row.state IN ('confirming', 'confirmed') THEN 'cash_due'
    ELSE 'unknown'
  END;
  NEW.payment_projection_updated_at := checkout_row.updated_at;
  NEW.payment_projection_source_updated_at := checkout_row.updated_at;
  NEW.payment_projection_reconciled_at := NOW();
  RETURN NEW;
END;
$$;

-- Governed partner creation reads and writes this case state. Keep legacy
-- partners representable as drafts, while constraining every future value to
-- the domain vocabulary implemented by the partner service.
ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS onboarding_case_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE dsh_partners
  DROP CONSTRAINT IF EXISTS dsh_partners_onboarding_case_status_check;
ALTER TABLE dsh_partners
  ADD CONSTRAINT dsh_partners_onboarding_case_status_check
  CHECK (onboarding_case_status IN (
    'draft', 'duplicate_suspected', 'validation_failed',
    'evidence_pending', 'unknown_result', 'submitted'
  ));

CREATE INDEX IF NOT EXISTS idx_dsh_partners_operator_context_onboarding_case
  ON dsh_partners(operator_context_id, onboarding_case_status, updated_at DESC);

-- Reinstall the canonical cancellation fan-out at the final migration
-- boundary so an order cannot remain terminal while dependent work stays
-- actionable in captain, partner-delivery, or pickup surfaces.
CREATE OR REPLACE FUNCTION dsh_cancel_order_dependent_work()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason TEXT;
BEGIN
  IF NEW.status NOT IN (
    'cancelled_by_client', 'cancelled_by_store', 'cancelled_by_operator',
    'cancelled_no_driver', 'failed_payment', 'failed_dispatch'
  ) OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_reason := COALESCE(
    NULLIF(BTRIM(NEW.cancellation_note), ''),
    NULLIF(BTRIM(NEW.cancellation_reason_code), ''),
    NEW.status
  );

  UPDATE dsh_assignments
  SET status = 'cancelled', last_latitude = NULL, last_longitude = NULL,
      location_recorded_at = NULL, updated_at = NOW()
  WHERE order_id = NEW.id AND status IN ('offered', 'accepted');

  UPDATE dsh_deliveries
  SET status = 'cancelled', note = COALESCE(NULLIF(note, ''), v_reason),
      updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('delivered', 'cancelled');

  UPDATE dsh_partner_delivery_tasks
  SET status = 'cancelled', version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('completed', 'cancelled');

  UPDATE dsh_pickup_sessions
  SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()),
      cancellation_reason = COALESCE(NULLIF(cancellation_reason, ''), v_reason),
      used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,
      version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status <> 'cancelled';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_cancel_order_dependent_work ON dsh_orders;
CREATE TRIGGER trg_dsh_cancel_order_dependent_work
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_cancel_order_dependent_work();

-- dsh-130 and dsh-958 were authored against the retired store status `active`
-- and execute on opposite sides of dsh-135. Rebuild both projections at the
-- final boundary so every current read owner uses the canonical `published`
-- lifecycle and reports the same readiness result as the Go publication gate.
DROP INDEX IF EXISTS idx_dsh_stores_operational_visibility_area;
ALTER TABLE dsh_stores
  DROP CONSTRAINT IF EXISTS dsh_stores_visibility_status_projection_check;
ALTER TABLE dsh_stores
  DROP COLUMN IF EXISTS visibility_status;
ALTER TABLE dsh_stores
  ADD COLUMN visibility_status TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN is_visible = TRUE
       AND status = 'published'
       AND serviceability_status IN ('serviceable', 'limited')
       AND partner_readiness = 'ready'
       AND catalog_approval_status = 'approved'
       AND marketing_visibility = 'visible'
      THEN 'visible'
      ELSE 'hidden'
    END
  ) STORED;
ALTER TABLE dsh_stores
  ADD CONSTRAINT dsh_stores_visibility_status_projection_check
  CHECK (visibility_status IN ('visible', 'hidden'));
CREATE INDEX idx_dsh_stores_operational_visibility_area
  ON dsh_stores(service_area_code, visibility_status)
  WHERE visibility_status = 'visible';

DROP INDEX IF EXISTS idx_dsh_stores_public_discovery_gate;
CREATE INDEX idx_dsh_stores_public_discovery_gate
  ON dsh_stores(city_code, service_area_code, display_name, id)
  WHERE is_visible = TRUE
    AND status = 'published'
    AND serviceability_status IN ('serviceable', 'limited')
    AND partner_readiness = 'ready'
    AND catalog_approval_status = 'approved'
    AND marketing_visibility = 'visible'
    AND COALESCE(cardinality(delivery_modes), 0) > 0
    AND btrim(COALESCE(address_line, '')) <> ''
    AND btrim(COALESCE(coverage_summary, '')) <> ''
    AND btrim(COALESCE(operating_hours, '')) <> ''
    AND delivery_readiness = 'ready'
    AND btrim(COALESCE(hero_image_url, '')) <> ''
    AND btrim(COALESCE(logo_url, '')) <> '';

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
    AND btrim(COALESCE(s.hero_image_url, '')) <> ''
    AND btrim(COALESCE(s.logo_url, '')) <> ''
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
    AND btrim(COALESCE(s.hero_image_url, '')) <> ''
    AND btrim(COALESCE(s.logo_url, '')) <> ''
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
    CASE WHEN btrim(COALESCE(s.hero_image_url, '')) = '' THEN 'STORE_COVER_MISSING' END,
    CASE WHEN btrim(COALESCE(s.logo_url, '')) = '' THEN 'STORE_LOGO_MISSING' END,
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

COMMIT;
