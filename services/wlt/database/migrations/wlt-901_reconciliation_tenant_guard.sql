-- Bind every reconciliation case to the tenant that owns its payment session.
-- Callers may omit tenant_id only because WLT derives it from its own canonical
-- session row. A supplied cross-tenant value is rejected before persistence.
CREATE OR REPLACE FUNCTION wlt_bind_reconciliation_case_tenant()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_tenant_id text;
BEGIN
  SELECT tenant_id
  INTO session_tenant_id
  FROM wlt_payment_sessions
  WHERE id = NEW.payment_session_id;

  IF session_tenant_id IS NULL OR btrim(session_tenant_id) = '' THEN
    RAISE EXCEPTION 'reconciliation payment session tenant is missing'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.tenant_id IS NULL OR btrim(NEW.tenant_id) = '' THEN
    NEW.tenant_id := session_tenant_id;
  ELSIF NEW.tenant_id <> session_tenant_id THEN
    RAISE EXCEPTION 'reconciliation tenant does not own payment session'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS wlt_reconciliation_case_tenant_guard
  ON wlt_reconciliation_cases;

CREATE TRIGGER wlt_reconciliation_case_tenant_guard
BEFORE INSERT OR UPDATE OF tenant_id, payment_session_id
ON wlt_reconciliation_cases
FOR EACH ROW
EXECUTE FUNCTION wlt_bind_reconciliation_case_tenant();

-- Backfill or verify any historical rows before the NOT NULL boundary is used.
UPDATE wlt_reconciliation_cases AS reconciliation
SET tenant_id = session.tenant_id,
    updated_at = now()
FROM wlt_payment_sessions AS session
WHERE session.id = reconciliation.payment_session_id
  AND (reconciliation.tenant_id IS NULL OR btrim(reconciliation.tenant_id) = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_reconciliation_cases AS reconciliation
    JOIN wlt_payment_sessions AS session
      ON session.id = reconciliation.payment_session_id
    WHERE reconciliation.tenant_id IS DISTINCT FROM session.tenant_id
  ) THEN
    RAISE EXCEPTION 'reconciliation tenant boundary contains mismatched rows';
  END IF;
END
$$;
