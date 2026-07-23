-- DSH-954: complete the trusted server-side tenant-context contract.
--
-- Tenant ownership remains explicit or parent-derived. A missing tenant may be
-- supplied only through the PostgreSQL session setting `bthwani.tenant_id`,
-- which is controlled by the backend/worker connection and is never a column
-- default. This keeps production fail-closed while allowing isolated workers,
-- migrations, and DB integration tests to establish trusted request context.

CREATE OR REPLACE FUNCTION dsh_trusted_tenant_context()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(BTRIM(current_setting('bthwani.tenant_id', TRUE)), '');
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_partner_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  session_tenant TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.tenant_id IS NOT NULL
     AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
    RAISE EXCEPTION 'TENANT_OWNERSHIP_IMMUTABLE: partner tenant cannot change'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.tenant_id IS NULL OR BTRIM(NEW.tenant_id) = '' THEN
    session_tenant := dsh_trusted_tenant_context();
    IF session_tenant IS NULL THEN
      RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: trusted partner tenant is required';
    END IF;
    NEW.tenant_id := session_tenant;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_partners_tenant ON dsh_partners;
CREATE TRIGGER trg_dsh_partners_tenant
BEFORE INSERT OR UPDATE ON dsh_partners
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_tenant();

CREATE OR REPLACE FUNCTION dsh_enforce_store_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_tenant TEXT;
  session_tenant TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL AND BTRIM(NEW.partner_id) <> '' THEN
    SELECT tenant_id INTO owner_tenant
    FROM dsh_partners
    WHERE id = NEW.partner_id;

    IF owner_tenant IS NULL OR BTRIM(owner_tenant) = '' THEN
      RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: partner tenant not found';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.tenant_id IS NOT NULL
       AND BTRIM(OLD.tenant_id) <> ''
       AND OLD.tenant_id IS DISTINCT FROM owner_tenant THEN
      RAISE EXCEPTION 'TENANT_OWNERSHIP_IMMUTABLE: store cannot move across tenants'
        USING ERRCODE = '23514';
    END IF;

    NEW.tenant_id := owner_tenant;
  ELSE
    IF NEW.tenant_id IS NULL OR BTRIM(NEW.tenant_id) = '' THEN
      session_tenant := dsh_trusted_tenant_context();
      IF session_tenant IS NULL THEN
        RAISE EXCEPTION 'TENANT_CONTEXT_REQUIRED: trusted store tenant is required';
      END IF;
      NEW.tenant_id := session_tenant;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.tenant_id IS NOT NULL
       AND BTRIM(OLD.tenant_id) <> ''
       AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'TENANT_OWNERSHIP_IMMUTABLE: store tenant cannot change'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_stores_tenant ON dsh_stores;
CREATE TRIGGER trg_dsh_stores_tenant
BEFORE INSERT OR UPDATE ON dsh_stores
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_tenant();
