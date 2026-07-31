-- DSH-962: apply the platform-context error vocabulary without rewriting
-- immutable historical migrations. Column and setting renames are intentionally
-- handled by a separate schema migration once every runtime consumer is moved.

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
    RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: partner context cannot change'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
    session_OperatorContext := dsh_trusted_OperatorContext_context();
    IF session_OperatorContext IS NULL THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted partner context is required';
    END IF;
    NEW.operator_context_id := session_OperatorContext;
  END IF;

  RETURN NEW;
END;
$$;

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
      RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: partner context not found';
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND OLD.operator_context_id IS DISTINCT FROM owner_OperatorContext THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store cannot move across contexts'
        USING ERRCODE = '23514';
    END IF;

    NEW.operator_context_id := owner_OperatorContext;
  ELSE
    IF NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '' THEN
      session_OperatorContext := dsh_trusted_OperatorContext_context();
      IF session_OperatorContext IS NULL THEN
        RAISE EXCEPTION 'PLATFORM_CONTEXT_REQUIRED: trusted store context is required';
      END IF;
      NEW.operator_context_id := session_OperatorContext;
    END IF;

    IF TG_OP = 'UPDATE'
       AND OLD.operator_context_id IS NOT NULL
       AND BTRIM(OLD.operator_context_id) <> ''
       AND NEW.operator_context_id IS DISTINCT FROM OLD.operator_context_id THEN
      RAISE EXCEPTION 'PLATFORM_CONTEXT_OWNERSHIP_IMMUTABLE: store context cannot change'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
