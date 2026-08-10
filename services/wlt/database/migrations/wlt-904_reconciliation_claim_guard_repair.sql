-- WLT-904: forward repair for the payout reconciliation single-claim guard.
--
-- Some pre-release databases recorded an earlier form of wlt-902 before the
-- trigger was present. A checksum-compatible migration history must not be
-- mistaken for the live invariant, so this migration reinstalls the database
-- boundary explicitly and is verified by payout-destination-invariants.sql.

CREATE OR REPLACE FUNCTION wlt_reject_duplicate_reconciliation_claim()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.reconciliation_status = 'inquiry_pending'
     AND NEW.reconciliation_status = 'inquiry_pending' THEN
    RAISE EXCEPTION
      'payout reconciliation is already in progress for %', NEW.id
      USING ERRCODE = '55P03';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_single_reconciliation_claim_trigger
  ON wlt_payout_requests;
CREATE TRIGGER wlt_single_reconciliation_claim_trigger
BEFORE UPDATE OF reconciliation_status ON wlt_payout_requests
FOR EACH ROW
EXECUTE FUNCTION wlt_reject_duplicate_reconciliation_claim();

COMMENT ON FUNCTION wlt_reject_duplicate_reconciliation_claim() IS
  'Rejects a duplicate payout-provider inquiry claim while reconciliation is already in progress.';
