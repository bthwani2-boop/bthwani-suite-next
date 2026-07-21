-- WLT-034: payout-destination idempotency and single-active ownership.
-- WLT remains the sovereign owner of partner payout destinations. DSH may
-- submit raw payout details only to this boundary and stores only the returned
-- reference plus masked display values.

CREATE TABLE IF NOT EXISTS wlt_payout_destination_requests (
  partner_id            text        NOT NULL,
  idempotency_key       text        NOT NULL,
  request_hash          text        NOT NULL,
  payout_destination_id text        NOT NULL REFERENCES wlt_payout_destinations(id) ON DELETE RESTRICT,
  correlation_id        text        NOT NULL,
  created_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (partner_id, idempotency_key),
  CONSTRAINT wlt_payout_destination_requests_key_length
    CHECK (length(btrim(idempotency_key)) >= 8)
);

CREATE INDEX IF NOT EXISTS wlt_payout_destination_requests_destination_idx
  ON wlt_payout_destination_requests(payout_destination_id);

-- Repair historical duplicate-active rows deterministically before adding the
-- invariant. The newest destination remains active; older rows remain retained
-- for audit but cannot be selected as the current payout destination.
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY partner_id
           ORDER BY created_at DESC, id DESC
         ) AS position
  FROM wlt_payout_destinations
  WHERE active = true
)
UPDATE wlt_payout_destinations AS destination
SET active = false,
    updated_at = now()
FROM ranked
WHERE destination.id = ranked.id
  AND ranked.position > 1;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_destinations_one_active_partner_idx
  ON wlt_payout_destinations(partner_id)
  WHERE active = true;
