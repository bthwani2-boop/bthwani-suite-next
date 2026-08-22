-- WLT-927: bind every checkout payment session and its allocation to the
-- immutable canonical pricing quote identity used to authorize the amount.

BEGIN;

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS pricing_quote_id text,
  ADD COLUMN IF NOT EXISTS pricing_quote_hash text,
  ADD COLUMN IF NOT EXISTS pricing_quote_version integer,
  ADD COLUMN IF NOT EXISTS pricing_quote_expires_at timestamptz;

-- Existing checkout sessions predate the quote-binding contract. Preserve
-- their immutable cart snapshot as an explicit legacy binding so the new
-- invariant can be installed without pretending that a later quote was used
-- at payment time. New checkout writes are rejected unless all four fields
-- are supplied by the canonical quote owner.
UPDATE wlt_payment_sessions
SET pricing_quote_id = 'legacy-checkout-quote:' || id,
    pricing_quote_hash = COALESCE(NULLIF(btrim(cart_snapshot_hash), ''), md5(id)),
    pricing_quote_version = 1,
    pricing_quote_expires_at = COALESCE(created_at + INTERVAL '1 hour', NOW())
WHERE checkout_intent_id IS NOT NULL
  AND (pricing_quote_id IS NULL OR pricing_quote_hash IS NULL
       OR pricing_quote_version IS NULL OR pricing_quote_expires_at IS NULL);

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_pricing_quote_binding_chk;
ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_pricing_quote_binding_chk CHECK (
    (checkout_intent_id IS NULL AND pricing_quote_id IS NULL AND pricing_quote_hash IS NULL
      AND pricing_quote_version IS NULL AND pricing_quote_expires_at IS NULL)
    OR
    (checkout_intent_id IS NOT NULL AND btrim(COALESCE(pricing_quote_id, '')) <> ''
      AND btrim(COALESCE(pricing_quote_hash, '')) <> ''
      AND pricing_quote_version IS NOT NULL AND pricing_quote_version > 0
      AND pricing_quote_expires_at IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS wlt_payment_sessions_pricing_quote_hash_idx
  ON wlt_payment_sessions (operator_context_id, pricing_quote_hash)
  WHERE pricing_quote_hash IS NOT NULL;

COMMENT ON COLUMN wlt_payment_sessions.pricing_quote_id IS
  'Immutable WLT pricing quote identity bound to the checkout payment session.';
COMMENT ON COLUMN wlt_payment_sessions.pricing_quote_hash IS
  'Canonical quote content hash; the payment amount is not authoritative without this binding.';

COMMIT;
