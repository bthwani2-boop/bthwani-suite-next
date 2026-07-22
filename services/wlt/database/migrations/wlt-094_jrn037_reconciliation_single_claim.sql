-- WLT-094 / JRN-037: prevent a second worker from claiming the same ambiguous
-- provider result after it has already entered inquiry_pending. The payout row
-- is selected FOR UPDATE by the application; this trigger is the final data
-- boundary that rejects an inquiry_pending -> inquiry_pending re-claim before
-- another provider inquiry can be issued.

CREATE OR REPLACE FUNCTION wlt_jrn037_reject_duplicate_reconciliation_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.reconciliation_status = 'inquiry_pending'
     AND NEW.reconciliation_status = 'inquiry_pending' THEN
    RAISE EXCEPTION 'payout reconciliation is already in progress for %', NEW.id
      USING ERRCODE = '55P03';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_jrn037_single_reconciliation_claim_trigger ON wlt_payout_requests;
CREATE TRIGGER wlt_jrn037_single_reconciliation_claim_trigger
BEFORE UPDATE OF reconciliation_status ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_jrn037_reject_duplicate_reconciliation_claim();

COMMENT ON FUNCTION wlt_jrn037_reject_duplicate_reconciliation_claim() IS
  'Rejects duplicate payout provider inquiry claims while the first reconciliation is in progress.';
