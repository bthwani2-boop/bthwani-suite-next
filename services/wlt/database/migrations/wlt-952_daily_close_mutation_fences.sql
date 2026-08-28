-- WLT-952: database-level fencing for closed finance periods.
-- A close is a durable period boundary. No later provider statement import may
-- alter that period, and the close record itself is immutable.

BEGIN;

CREATE OR REPLACE FUNCTION wlt_reject_statement_import_after_close()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_daily_finance_close close_record
    WHERE close_record.operator_context_id = NEW.operator_context_id
      AND close_record.business_date = NEW.business_date
  ) THEN
    RAISE EXCEPTION 'cannot import external statement for closed business date %', NEW.business_date
      USING ERRCODE = 'P0001';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_external_statement_closed_period_fence
  ON wlt_external_provider_statements;
CREATE TRIGGER wlt_external_statement_closed_period_fence
  BEFORE INSERT OR UPDATE ON wlt_external_provider_statements
  FOR EACH ROW EXECUTE FUNCTION wlt_reject_statement_import_after_close();

CREATE OR REPLACE FUNCTION wlt_reject_daily_close_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'daily finance close records are immutable'
    USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS wlt_daily_finance_close_immutable
  ON wlt_daily_finance_close;
CREATE TRIGGER wlt_daily_finance_close_immutable
  BEFORE UPDATE OR DELETE ON wlt_daily_finance_close
  FOR EACH ROW EXECUTE FUNCTION wlt_reject_daily_close_mutation();

COMMIT;
