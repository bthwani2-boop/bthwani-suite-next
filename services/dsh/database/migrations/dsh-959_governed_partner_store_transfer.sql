-- DSH-959: reconcile immutable ownership protection with governed transfers.
--
-- Direct partner replacement remains forbidden. The governed backend path may
-- open a transaction-local transfer context only after validating tenant,
-- version, reason, and open operations. A deferred constraint trigger then
-- requires the matching durable audit row before the transaction can commit.

CREATE OR REPLACE FUNCTION dsh_prevent_store_partner_reassignment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.partner_id IS NOT NULL
     AND NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND current_setting('bthwani.governed_store_partner_transfer', TRUE) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'STORE_PARTNER_REASSIGNMENT_FORBIDDEN'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_require_store_partner_transfer_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.partner_id IS NOT NULL
     AND NEW.partner_id IS DISTINCT FROM OLD.partner_id
     AND NOT EXISTS (
       SELECT 1
       FROM dsh_partner_store_transfer_audit audit
       WHERE audit.tenant_id = NEW.tenant_id
         AND audit.store_id = NEW.id
         AND audit.from_partner_id = OLD.partner_id
         AND audit.to_partner_id = NEW.partner_id
         AND audit.expected_store_version = OLD.version
         AND audit.resulting_store_version = NEW.version
     ) THEN
    RAISE EXCEPTION 'STORE_PARTNER_TRANSFER_AUDIT_REQUIRED'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS dsh_stores_partner_transfer_audit_guard ON dsh_stores;
CREATE CONSTRAINT TRIGGER dsh_stores_partner_transfer_audit_guard
AFTER UPDATE OF partner_id ON dsh_stores
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION dsh_require_store_partner_transfer_audit();
