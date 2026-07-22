-- DSH-098: JRN-004 store discovery, context, and governance closure.
-- Adds forward-write invariants, audit/idempotency retention metadata, and
-- query indexes aligned with the governed public and operator read paths.

UPDATE dsh_stores
SET version = 1
WHERE version < 1;

ALTER TABLE dsh_stores
  DROP CONSTRAINT IF EXISTS dsh_stores_version_positive_chk;
ALTER TABLE dsh_stores
  ADD CONSTRAINT dsh_stores_version_positive_chk CHECK (version >= 1);

ALTER TABLE dsh_store_action_audit
  DROP CONSTRAINT IF EXISTS dsh_store_action_audit_actor_role_chk;
ALTER TABLE dsh_store_action_audit
  ADD CONSTRAINT dsh_store_action_audit_actor_role_chk
  CHECK (actor_role IN ('partner', 'field', 'captain', 'operator', 'system'));

ALTER TABLE dsh_store_idempotency
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

UPDATE dsh_store_idempotency
SET expires_at = created_at + interval '7 days'
WHERE expires_at IS NULL;

ALTER TABLE dsh_store_idempotency
  ALTER COLUMN expires_at SET DEFAULT (now() + interval '7 days'),
  ALTER COLUMN expires_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_operator_page
  ON dsh_stores(updated_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_dsh_stores_public_discovery_gate
  ON dsh_stores(city_code, service_area_code, display_name, id)
  WHERE is_visible = true
    AND status = 'active'
    AND serviceability_status IN ('serviceable', 'limited')
    AND partner_readiness = 'ready'
    AND catalog_approval_status = 'approved'
    AND marketing_visibility = 'visible'
    AND cardinality(delivery_modes) > 0
    AND btrim(COALESCE(address_line, '')) <> ''
    AND btrim(COALESCE(coverage_summary, '')) <> ''
    AND btrim(COALESCE(operating_hours, '')) <> ''
    AND delivery_readiness = 'ready'
    AND btrim(COALESCE(hero_image_url, '')) <> ''
    AND btrim(COALESCE(logo_url, '')) <> '';

CREATE INDEX IF NOT EXISTS idx_dsh_store_action_audit_correlation
  ON dsh_store_action_audit(correlation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_store_idempotency_expiry
  ON dsh_store_idempotency(expires_at, actor_id, operation);
