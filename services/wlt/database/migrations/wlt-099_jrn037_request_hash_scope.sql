-- WLT-099 / JRN-037: request_hash is evidence for an idempotency key,
-- not a permanent uniqueness key for a financial intent. Two legitimate
-- payouts may have the same actor, destination, amount and currency at
-- different times, while wlt_payout_requests.idempotency_key remains unique.

DROP INDEX IF EXISTS wlt_payout_requests_request_hash_uidx;

CREATE INDEX IF NOT EXISTS wlt_payout_requests_request_hash_idx
  ON wlt_payout_requests(request_hash, requested_at DESC)
  WHERE request_hash IS NOT NULL;
