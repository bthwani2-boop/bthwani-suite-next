-- Bind every reconciliation case to the OperatorContext that owns its payment session.
-- Callers may omit operator_context_id only because WLT derives it from its own canonical
-- session row. A supplied cross-OperatorContext value is rejected before persistence.
CREATE OR REPLACE FUNCTION wlt_bind_reconciliation_case_OperatorContext()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  session_operator_context_id text;
BEGIN
  SELECT operator_context_id
  INTO session_operator_context_id
  FROM wlt_payment_sessions
  WHERE id = NEW.payment_session_id;

  IF session_operator_context_id IS NULL OR btrim(session_operator_context_id) = '' THEN
    RAISE EXCEPTION 'reconciliation payment session OperatorContext is missing'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
    NEW.operator_context_id := session_operator_context_id;
  ELSIF NEW.operator_context_id <> session_operator_context_id THEN
    RAISE EXCEPTION 'reconciliation OperatorContext does not own payment session'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END
$$;

DROP TRIGGER IF EXISTS wlt_reconciliation_case_OperatorContext_guard
  ON wlt_reconciliation_cases;

CREATE TRIGGER wlt_reconciliation_case_OperatorContext_guard
BEFORE INSERT OR UPDATE OF operator_context_id, payment_session_id
ON wlt_reconciliation_cases
FOR EACH ROW
EXECUTE FUNCTION wlt_bind_reconciliation_case_OperatorContext();

-- Backfill or verify any historical rows before the NOT NULL boundary is used.
UPDATE wlt_reconciliation_cases AS reconciliation
SET operator_context_id = session.operator_context_id,
    updated_at = now()
FROM wlt_payment_sessions AS session
WHERE session.id = reconciliation.payment_session_id
  AND (reconciliation.operator_context_id IS NULL OR btrim(reconciliation.operator_context_id) = '');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_reconciliation_cases AS reconciliation
    JOIN wlt_payment_sessions AS session
      ON session.id = reconciliation.payment_session_id
    WHERE reconciliation.operator_context_id IS DISTINCT FROM session.operator_context_id
  ) THEN
    RAISE EXCEPTION 'reconciliation OperatorContext boundary contains mismatched rows';
  END IF;
END
$$;
