-- WLT-012: Payout request idempotency-key payload hash.
-- A reused Idempotency-Key on POST /wlt/payout-requests previously always
-- returned the earlier request, even if the caller sent a different
-- beneficiary/amount/currency the second time. This column lets the handler
-- detect that mismatch and return 409 IDEMPOTENCY_CONFLICT instead of
-- silently reusing the original payout intent. Nullable and backfill-safe:
-- existing rows have no hash and are simply never compared against.

ALTER TABLE wlt_payout_requests
  ADD COLUMN IF NOT EXISTS payload_hash text;
