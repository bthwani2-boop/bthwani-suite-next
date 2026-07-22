-- DSH-930 / JRN-008: functional slice closure for governed PIM attributes,
-- product alternatives, assortment pauses, and catalog audit/rollback.
--
-- This migration is additive and idempotent. It does not revive any retired
-- local catalog table; every new relation points at the sovereign central
-- catalog and store-assortment truth.

BEGIN;

-- ---------------------------------------------------------------------------
-- Product attributes need optimistic concurrency and an operator-readable
-- lifecycle. Existing rows are preserved and receive version 1.
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_catalog_attributes
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_attribute_options
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_catalog_node_attribute_rules
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_master_product_attribute_values
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- ---------------------------------------------------------------------------
-- Master-product relationships are central truth. Stores may choose from
-- substitutes/alternatives but may not invent product identities locally.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_master_product_relationships (
  id                        TEXT        PRIMARY KEY,
  source_master_product_id  TEXT        NOT NULL REFERENCES dsh_master_products(id) ON DELETE CASCADE,
  target_master_product_id  TEXT        NOT NULL REFERENCES dsh_master_products(id) ON DELETE CASCADE,
  relationship_type         TEXT        NOT NULL CHECK (relationship_type IN ('substitute', 'alternative', 'complement')),
  priority                  INTEGER     NOT NULL DEFAULT 0 CHECK (priority >= 0),
  reason                    TEXT        NOT NULL DEFAULT '',
  is_active                 BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by                TEXT        NOT NULL DEFAULT '',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version                   INTEGER     NOT NULL DEFAULT 1,
  CHECK (source_master_product_id <> target_master_product_id),
  UNIQUE (source_master_product_id, target_master_product_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS idx_dsh_master_product_relationships_source
  ON dsh_master_product_relationships (source_master_product_id, relationship_type, is_active, priority);
CREATE INDEX IF NOT EXISTS idx_dsh_master_product_relationships_target
  ON dsh_master_product_relationships (target_master_product_id, relationship_type, is_active);

-- ---------------------------------------------------------------------------
-- A pause is distinct from permanent unavailability. It has an accountable
-- reason, optional expiry and actor/time metadata, while the existing
-- availability and publication fields remain unchanged.
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_store_assortments
  ADD COLUMN IF NOT EXISTS pause_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_store_assortments
  ADD COLUMN IF NOT EXISTS paused_until TIMESTAMPTZ;
ALTER TABLE dsh_store_assortments
  ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE dsh_store_assortments
  ADD COLUMN IF NOT EXISTS paused_by TEXT;

DO $constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_store_assortments_pause_reason'
  ) THEN
    ALTER TABLE dsh_store_assortments
      ADD CONSTRAINT ck_dsh_store_assortments_pause_reason
      CHECK (paused_at IS NULL OR BTRIM(pause_reason) <> '');
  END IF;
END
$constraint$;

CREATE INDEX IF NOT EXISTS idx_dsh_store_assortments_paused
  ON dsh_store_assortments (store_id, paused_until)
  WHERE paused_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Generic append-only audit truth. The trigger captures the complete before
-- and after row so operators can inspect changes and perform a guarded rollback
-- of supported core entities without direct SQL access.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_catalog_entity_audit (
  id             TEXT        PRIMARY KEY,
  entity_type    TEXT        NOT NULL,
  entity_id      TEXT        NOT NULL,
  action         TEXT        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'ROLLBACK')),
  actor_id       TEXT        NOT NULL DEFAULT 'system',
  actor_role     TEXT        NOT NULL DEFAULT 'system',
  reason         TEXT        NOT NULL DEFAULT '',
  correlation_id TEXT        NOT NULL DEFAULT '',
  before_json    JSONB,
  after_json     JSONB,
  metadata_json  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_catalog_entity_audit_entity
  ON dsh_catalog_entity_audit (entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_catalog_entity_audit_created
  ON dsh_catalog_entity_audit (created_at DESC);

CREATE OR REPLACE FUNCTION dsh_catalog_capture_entity_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $audit$
DECLARE
  v_entity_id TEXT;
  v_actor_id TEXT := COALESCE(NULLIF(current_setting('bthwani.actor_id', TRUE), ''), 'system');
  v_actor_role TEXT := COALESCE(NULLIF(current_setting('bthwani.actor_role', TRUE), ''), 'system');
  v_reason TEXT := COALESCE(NULLIF(current_setting('bthwani.change_reason', TRUE), ''), '');
  v_correlation_id TEXT := COALESCE(NULLIF(current_setting('bthwani.correlation_id', TRUE), ''), '');
BEGIN
  v_entity_id := COALESCE(NEW.id, OLD.id);
  INSERT INTO dsh_catalog_entity_audit (
    id, entity_type, entity_id, action, actor_id, actor_role, reason,
    correlation_id, before_json, after_json
  ) VALUES (
    'catalog-audit-' || gen_random_uuid()::text,
    TG_TABLE_NAME,
    v_entity_id,
    TG_OP,
    v_actor_id,
    v_actor_role,
    v_reason,
    v_correlation_id,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  );
  RETURN COALESCE(NEW, OLD);
END
$audit$;

DO $triggers$
DECLARE
  v_table TEXT;
  v_trigger TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'dsh_catalog_domains',
    'dsh_catalog_nodes',
    'dsh_master_products',
    'dsh_master_product_attribute_values',
    'dsh_master_product_relationships',
    'dsh_store_assortments',
    'dsh_product_proposals',
    'dsh_catalog_platform_policies',
    'dsh_catalog_assets',
    'dsh_catalog_asset_links',
    'dsh_reels'
  ] LOOP
    IF to_regclass('public.' || v_table) IS NOT NULL THEN
      v_trigger := 'trg_' || v_table || '_catalog_audit';
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger, v_table);
      EXECUTE format(
        'CREATE TRIGGER %I AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION dsh_catalog_capture_entity_audit()',
        v_trigger,
        v_table
      );
    END IF;
  END LOOP;
END
$triggers$;

-- Guarded rollback supports UPDATE audit entries for the five central entities
-- whose snapshots are stable and whose restoration cannot recreate identities.
CREATE OR REPLACE FUNCTION dsh_catalog_rollback_audit(
  p_audit_id TEXT,
  p_actor_id TEXT,
  p_actor_role TEXT,
  p_reason TEXT,
  p_expected_version INTEGER
)
RETURNS TABLE (entity_type TEXT, entity_id TEXT, new_version INTEGER)
LANGUAGE plpgsql
AS $rollback$
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
      UPDATE dsh_store_assortments SET
        unit_price = (v_audit.before_json->>'unit_price')::NUMERIC,
        currency = v_audit.before_json->>'currency',
        available = (v_audit.before_json->>'available')::BOOLEAN,
        stock_status = v_audit.before_json->>'stock_status',
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
$rollback$;

COMMIT;
