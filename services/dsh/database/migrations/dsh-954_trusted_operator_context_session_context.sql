-- DSH-954: complete the trusted server-side OperatorContext-context contract.
--
-- OperatorContext ownership remains explicit or parent-derived. A missing OperatorContext may be
-- supplied only through the PostgreSQL session setting `bthwani.operator_context_id`,
-- which is controlled by the backend/worker connection and is never a column
-- default. This keeps production fail-closed while allowing isolated workers,
-- migrations, and DB integration tests to establish trusted request context.

CREATE OR REPLACE FUNCTION dsh_trusted_OperatorContext_context()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(BTRIM(current_setting('bthwani.operator_context_id', TRUE)), '');
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_partner_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  session_OperatorContext TEXT;
BEGIN
  IF TG_OP = 'UPDATE'
     AND OLD.operator_context_id IS NOT NULL
     AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
    RAISE EXCEPTION 'OperatorContext_OWNERSHIP_IMMUTABLE: partner OperatorContext cannot change'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
    session_OperatorContext := dsh_trusted_OperatorContext_context();
    IF session_OperatorContext IS NULL THEN
      RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: trusted partner OperatorContext is required';
    END IF;
    NEW.operator_context_id := session_OperatorContext;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_partners_OperatorContext ON dsh_partners;
CREATE TRIGGER trg_dsh_partners_OperatorContext
BEFORE INSERT OR UPDATE ON dsh_partners
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_partner_OperatorContext();

CREATE OR REPLACE FUNCTION dsh_enforce_store_OperatorContext()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  owner_OperatorContext TEXT;
  session_OperatorContext TEXT;
BEGIN
  IF NEW.partner_id IS NOT NULL AND BTRIM(NEW.partner_id) <> '' THEN
    SELECT operator_context_id INTO owner_OperatorContext
    FROM dsh_partners
    WHERE id = NEW.partner_id;

    IF owner_OperatorContext IS NULL OR BTRIM(owner_OperatorContext) = '' THEN
      RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: partner OperatorContext not found';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND OLD.operator_context_id IS DISTINCT FROM owner_OperatorContext THEN
      RAISE EXCEPTION 'OperatorContext_OWNERSHIP_IMMUTABLE: store cannot move across OperatorContexts'
        USING ERRCODE = '23514';
    END IF;

    NEW.operator_context_id := owner_OperatorContext;
  ELSE
    IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
      session_OperatorContext := dsh_trusted_OperatorContext_context();
      IF session_OperatorContext IS NULL THEN
        RAISE EXCEPTION 'OperatorContext_CONTEXT_REQUIRED: trusted store OperatorContext is required';
      END IF;
      NEW.operator_context_id := session_OperatorContext;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
      RAISE EXCEPTION 'OperatorContext_OWNERSHIP_IMMUTABLE: store OperatorContext cannot change'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_stores_OperatorContext ON dsh_stores;
CREATE TRIGGER trg_dsh_stores_OperatorContext
BEFORE INSERT OR UPDATE ON dsh_stores
FOR EACH ROW EXECUTE FUNCTION dsh_enforce_store_OperatorContext();
