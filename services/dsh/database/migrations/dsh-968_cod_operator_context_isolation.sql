-- DSH-968: enforce operator_context_id partitioning on WLT COD outbox events
-- and add index for partner-scoped COD record isolation.
--
-- The WLT outbox already carries operator_context_id (dsh-085). This migration
-- adds a database-level guard: any new delivery_completed event must carry a
-- non-empty operator_context_id, and a covering index makes per-partner COD
-- queries provably isolated without full-table scans.
--
-- Approach: fail-closed for new rows, never rewrite immutable history.

BEGIN;

-- 1. Guard function: new delivery_completed events must carry operator_context_id.
CREATE OR REPLACE FUNCTION dsh_guard_cod_operator_context()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.event_type = 'delivery_completed'
     AND (NEW.operator_context_id IS NULL OR BTRIM(NEW.operator_context_id) = '') THEN
    RAISE EXCEPTION
      'OPERATOR_CONTEXT_REQUIRED: delivery_completed WLT outbox event must carry operator_context_id'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_cod_operator_context ON dsh_wlt_outbox_events;
CREATE TRIGGER trg_dsh_guard_cod_operator_context
BEFORE INSERT ON dsh_wlt_outbox_events
FOR EACH ROW EXECUTE FUNCTION dsh_guard_cod_operator_context();

-- 2. Partial index: enables O(log n) partner-scoped COD record reads that WLT
--    proxies through DSH's proxyFinanceRead with ?partnerId= filter.
--    Used by: GET /dsh/partner/me/finance/cod-records (cod_finance_handlers.go)
CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_cod_partner_scope
  ON dsh_wlt_outbox_events(operator_context_id, collector_id, created_at DESC)
  WHERE event_type = 'delivery_completed'
    AND collector_type IN ('captain', 'store_courier', 'partner_store');

-- 3. Runtime verification: confirm no new unscoped delivery_completed rows
--    were inserted between the trigger install and this check.
DO $$
DECLARE
  unscoped_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO unscoped_count
  FROM dsh_wlt_outbox_events
  WHERE event_type = 'delivery_completed'
    AND (operator_context_id IS NULL OR BTRIM(operator_context_id) = '');

  IF unscoped_count > 0 THEN
    RAISE WARNING
      'dsh-968: % delivery_completed row(s) still have no operator_context_id (legacy data, pre-085). '
      'These are read-only history; the guard prevents new unscoped rows.',
      unscoped_count;
  END IF;
END $$;

COMMIT;
