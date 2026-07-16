-- WLT-019: Record which operator performed each payout-request status
-- transition, so maker/checker separation (the same actor cannot both
-- approve and complete a payout) can be enforced and audited. The existing
-- generic `operator_id` column is left in place but is no longer the only
-- record kept -- each transition now has its own column so an
-- approved-then-completed-by-the-same-person case can actually be detected.

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS approved_by_operator_id  text,
  ADD COLUMN IF NOT EXISTS rejected_by_operator_id  text,
  ADD COLUMN IF NOT EXISTS processed_by_operator_id text,
  ADD COLUMN IF NOT EXISTS completed_by_operator_id text,
  ADD COLUMN IF NOT EXISTS failed_by_operator_id    text;
