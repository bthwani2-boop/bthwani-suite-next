-- WLT-116: Drop confirmed-dead audit-event tables (X3).
--
-- wlt_audit_events and wlt_cod_reconciliation_audit_events have zero Go
-- references anywhere in services/wlt/backend/internal (no INSERT/UPDATE/
-- SELECT in any non-test file, and no incoming FK from any other table).
-- The live audit trail for these domains is wlt_payout_audit_events
-- (payout) and the per-domain governed-mutation receipt tables, which this
-- migration does not touch.

DO $$
DECLARE
  audit_events_count integer;
  cod_reconciliation_audit_count integer;
BEGIN
  SELECT count(*) INTO audit_events_count FROM wlt_audit_events;
  SELECT count(*) INTO cod_reconciliation_audit_count FROM wlt_cod_reconciliation_audit_events;
  IF audit_events_count > 0 OR cod_reconciliation_audit_count > 0 THEN
    RAISE EXCEPTION 'wlt-116: refusing to drop non-empty dead audit tables (wlt_audit_events=%, wlt_cod_reconciliation_audit_events=%); this contradicts the "zero Go reference" analysis and needs investigation before the migration can proceed', audit_events_count, cod_reconciliation_audit_count;
  END IF;
END $$;

DROP TABLE IF EXISTS wlt_audit_events;
DROP TABLE IF EXISTS wlt_cod_reconciliation_audit_events;
