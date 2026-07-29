-- DSH-962: apply the platform-context error vocabulary without rewriting
-- immutable historical migrations. Column and setting renames are intentionally
-- handled by a separate schema migration once every runtime consumer is moved.

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
    RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: partner context cannot change'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.tenant_id IS NULL OR BTRIM(NEW.tenant_id) = '' THEN
    session_tenant := dsh_trusted_tenant_context();
    IF session_tenant IS NULL THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted partner context is required';
    END IF;
    NEW.tenant_id := session_tenant;
  END IF;

  RETURN NEW;
END;
$$;

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
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: partner context not found';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.tenant_id IS NOT NULL
       AND BTRIM(OLD.tenant_id) <> ''
       AND OLD.tenant_id IS DISTINCT FROM owner_tenant THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store cannot move across contexts'
        USING ERRCODE = '23514';
    END IF;

    NEW.tenant_id := owner_tenant;
  ELSE
    IF NEW.tenant_id IS NULL OR BTRIM(NEW.tenant_id) = '' THEN
      session_tenant := dsh_trusted_tenant_context();
      IF session_tenant IS NULL THEN
        RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted store context is required';
      END IF;
      NEW.tenant_id := session_tenant;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.tenant_id IS NOT NULL
       AND BTRIM(OLD.tenant_id) <> ''
       AND NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store context cannot change'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
