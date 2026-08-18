-- Historical COD custody tables are retained for read-only reconciliation.
-- No new collection, remittance, evidence, or custody reconciliation facts
-- may be created after the captain-funded COD cutover.
CREATE OR REPLACE FUNCTION wlt_reject_legacy_cod_custody_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION
    'legacy COD custody relation % is read-only after captain-funded cutover',
    TG_TABLE_NAME
    USING ERRCODE = '55000';
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.wlt_cod_records') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS wlt_legacy_cod_records_write_fence ON wlt_cod_records;
    CREATE TRIGGER wlt_legacy_cod_records_write_fence
      BEFORE INSERT OR UPDATE OR DELETE ON wlt_cod_records
      FOR EACH ROW EXECUTE FUNCTION wlt_reject_legacy_cod_custody_mutation();
  END IF;

  IF to_regclass('public.wlt_cod_custody_evidence') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS wlt_legacy_cod_custody_evidence_write_fence ON wlt_cod_custody_evidence;
    CREATE TRIGGER wlt_legacy_cod_custody_evidence_write_fence
      BEFORE INSERT OR UPDATE OR DELETE ON wlt_cod_custody_evidence
      FOR EACH ROW EXECUTE FUNCTION wlt_reject_legacy_cod_custody_mutation();
  END IF;

  IF to_regclass('public.wlt_cod_reconciliation_cases') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS wlt_legacy_cod_reconciliation_cases_write_fence ON wlt_cod_reconciliation_cases;
    CREATE TRIGGER wlt_legacy_cod_reconciliation_cases_write_fence
      BEFORE INSERT OR UPDATE OR DELETE ON wlt_cod_reconciliation_cases
      FOR EACH ROW EXECUTE FUNCTION wlt_reject_legacy_cod_custody_mutation();
  END IF;

  IF to_regclass('public.wlt_cod_reconciliation_audit_events') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS wlt_legacy_cod_reconciliation_audit_write_fence ON wlt_cod_reconciliation_audit_events;
    CREATE TRIGGER wlt_legacy_cod_reconciliation_audit_write_fence
      BEFORE INSERT OR UPDATE OR DELETE ON wlt_cod_reconciliation_audit_events
      FOR EACH ROW EXECUTE FUNCTION wlt_reject_legacy_cod_custody_mutation();
  END IF;
END;
$$;

COMMENT ON FUNCTION wlt_reject_legacy_cod_custody_mutation() IS
  'Blocks new legacy COD cash-custody/remittance facts; historical rows remain queryable for explicit reconciliation.';
