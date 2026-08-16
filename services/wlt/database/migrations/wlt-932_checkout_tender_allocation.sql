-- WLT-932: persist the exact checkout tender split owned by WLT.
-- Price allocation explains what the order costs; tender allocation explains
-- how that same total is paid. They are separate financial facts.

BEGIN;

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS wallet_amount_minor_units BIGINT,
  ADD COLUMN IF NOT EXISTS cash_on_delivery_amount_minor_units BIGINT;

-- The old official_wallet label was a checkout alias for a wallet-funded
-- order, not a second settlement rail. Canonicalize only checkout rows; the
-- same label remains valid for non-checkout funding destinations. Refuse the
-- conversion if a legacy row has a COD custody record, because that would be
-- evidence of a conflicting historical owner and needs WLT reconciliation.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_payment_sessions s
    JOIN wlt_cod_records c ON c.order_id = s.checkout_intent_id
    WHERE s.checkout_intent_id IS NOT NULL
      AND s.payment_method = 'official_wallet'
  ) THEN
    RAISE EXCEPTION
      'WLT-932: legacy official_wallet checkout has COD custody; reconcile the conflicting financial facts before canonicalization';
  END IF;
END $$;

UPDATE wlt_payment_sessions
SET payment_method = 'wallet'
WHERE checkout_intent_id IS NOT NULL
  AND payment_method = 'official_wallet';

-- Only cod and canonical wallet have an unambiguous historical split. A
-- historical mixed checkout cannot be reconstructed safely from current
-- state; leave it unresolved so rollout fails closed rather than inventing
-- exposure.
UPDATE wlt_payment_sessions
SET wallet_amount_minor_units = CASE WHEN payment_method = 'wallet' THEN amount_minor_units ELSE 0 END,
    cash_on_delivery_amount_minor_units = CASE WHEN payment_method = 'cod' THEN amount_minor_units ELSE 0 END
WHERE checkout_intent_id IS NOT NULL
  AND wallet_amount_minor_units IS NULL
  AND cash_on_delivery_amount_minor_units IS NULL
  AND payment_method IN ('cod', 'wallet');

DO $$
DECLARE unresolved BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved
  FROM wlt_payment_sessions
  WHERE checkout_intent_id IS NOT NULL
    AND (wallet_amount_minor_units IS NULL OR cash_on_delivery_amount_minor_units IS NULL);
  IF unresolved <> 0 THEN
    RAISE EXCEPTION
      'WLT-932: % checkout payment session(s) have no provable tender allocation; reconcile them before enabling the invariant',
      unresolved;
  END IF;
END $$;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_checkout_tender_allocation_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_checkout_tender_allocation_chk CHECK (
    (checkout_intent_id IS NULL
      AND wallet_amount_minor_units IS NULL
      AND cash_on_delivery_amount_minor_units IS NULL)
    OR (
      checkout_intent_id IS NOT NULL
      AND wallet_amount_minor_units IS NOT NULL
      AND cash_on_delivery_amount_minor_units IS NOT NULL
      AND wallet_amount_minor_units >= 0
      AND cash_on_delivery_amount_minor_units >= 0
      AND wallet_amount_minor_units + cash_on_delivery_amount_minor_units = amount_minor_units
    )
  );

CREATE OR REPLACE FUNCTION wlt_reject_checkout_tender_allocation_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.checkout_intent_id IS NOT NULL
     AND (OLD.wallet_amount_minor_units IS DISTINCT FROM NEW.wallet_amount_minor_units
       OR OLD.cash_on_delivery_amount_minor_units IS DISTINCT FROM NEW.cash_on_delivery_amount_minor_units) THEN
    RAISE EXCEPTION 'WLT-932: checkout tender allocation is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_checkout_tender_allocation_immutable_trg
  ON wlt_payment_sessions;
CREATE TRIGGER wlt_checkout_tender_allocation_immutable_trg
BEFORE UPDATE OF wallet_amount_minor_units, cash_on_delivery_amount_minor_units
ON wlt_payment_sessions
FOR EACH ROW EXECUTE FUNCTION wlt_reject_checkout_tender_allocation_mutation();

COMMENT ON COLUMN wlt_payment_sessions.wallet_amount_minor_units IS
  'WLT-owned checkout tender amount paid from the client wallet at the immutable handoff snapshot.';
COMMENT ON COLUMN wlt_payment_sessions.cash_on_delivery_amount_minor_units IS
  'WLT-owned checkout tender amount exposed to physical COD custody and captain capacity.';

COMMIT;
