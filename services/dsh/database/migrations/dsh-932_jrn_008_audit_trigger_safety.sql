-- DSH-932 / JRN-008: make trigger behavior explicit for DELETE records and
-- synchronize the deterministic pause restore bit on normal availability writes.

BEGIN;

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
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
  ELSE
    v_entity_id := NEW.id;
  END IF;

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

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$audit$;

CREATE OR REPLACE FUNCTION dsh_assortment_sync_pause_restore_state()
RETURNS trigger
LANGUAGE plpgsql
AS $pause_sync$
BEGIN
  -- A normal non-paused availability write becomes the next deterministic
  -- restore target. During a pause, available_before_pause is preserved.
  IF NEW.paused_at IS NULL THEN
    NEW.available_before_pause := NEW.available;
  END IF;
  RETURN NEW;
END
$pause_sync$;

DROP TRIGGER IF EXISTS trg_dsh_store_assortments_pause_restore_state ON dsh_store_assortments;
CREATE TRIGGER trg_dsh_store_assortments_pause_restore_state
BEFORE INSERT OR UPDATE OF available, paused_at
ON dsh_store_assortments
FOR EACH ROW
EXECUTE FUNCTION dsh_assortment_sync_pause_restore_state();

COMMIT;
