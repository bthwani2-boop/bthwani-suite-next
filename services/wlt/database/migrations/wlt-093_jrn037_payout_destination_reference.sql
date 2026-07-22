-- WLT-093 / JRN-037: a governed payout request retains the destination
-- reference used for the financial intent. Legacy rows may remain NULL, but
-- every non-NULL reference must resolve to a WLT-owned destination and cannot
-- be deleted while payout history exists.

ALTER TABLE wlt_payout_requests
  DROP CONSTRAINT IF EXISTS wlt_payout_requests_destination_fk;

ALTER TABLE wlt_payout_requests
  ADD CONSTRAINT wlt_payout_requests_destination_fk
  FOREIGN KEY (payout_destination_id)
  REFERENCES wlt_payout_destinations(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE wlt_payout_requests
  VALIDATE CONSTRAINT wlt_payout_requests_destination_fk;
