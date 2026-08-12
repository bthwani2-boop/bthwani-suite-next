-- WLT-930: make the canonical checkout quote binding a database invariant.
-- Application validation is necessary but not sufficient for financial facts:
-- an administrative SQL write or future caller must not manufacture a quote
-- identity, amount, allocation basis, or expiry outside WLT's immutable quote
-- store.

BEGIN;

CREATE OR REPLACE FUNCTION wlt_assert_checkout_session_quote_binding()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  quote_matches boolean;
BEGIN
  IF NEW.checkout_intent_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- WLT-927 explicitly marked pre-existing rows as historical bindings. They
  -- cannot be re-created by a new insert and remain readable/updatable only
  -- for non-financial lifecycle state changes.
  IF NEW.pricing_quote_id LIKE 'legacy-checkout-quote:%' THEN
    IF TG_OP = 'UPDATE' AND OLD.pricing_quote_id = NEW.pricing_quote_id THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'new checkout payment sessions require a canonical WLT pricing quote';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM wlt_checkout_pricing_quotes q
    WHERE q.id = NEW.pricing_quote_id
      AND q.operator_context_id = NEW.operator_context_id
      AND q.checkout_intent_id = NEW.checkout_intent_id
      AND q.client_id = NEW.client_id
      AND q.store_id = NEW.store_id
      AND q.cart_snapshot_hash = NEW.cart_snapshot_hash
      AND q.quote_hash = NEW.pricing_quote_hash
      AND q.quote_version = NEW.pricing_quote_version
      AND q.expires_at = NEW.pricing_quote_expires_at
      AND q.total_minor_units = NEW.amount_minor_units
      AND q.currency = NEW.currency
      AND q.expires_at > NOW()
  ) INTO quote_matches;

  IF NOT quote_matches THEN
    RAISE EXCEPTION 'checkout payment session must match an unexpired immutable WLT pricing quote';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wlt_checkout_session_quote_binding_trg
  ON wlt_payment_sessions;
CREATE TRIGGER wlt_checkout_session_quote_binding_trg
BEFORE INSERT OR UPDATE OF checkout_intent_id, operator_context_id, client_id, store_id,
  cart_snapshot_hash, pricing_quote_id, pricing_quote_hash, pricing_quote_version,
  pricing_quote_expires_at, amount_minor_units, currency
ON wlt_payment_sessions
FOR EACH ROW EXECUTE FUNCTION wlt_assert_checkout_session_quote_binding();

COMMENT ON FUNCTION wlt_assert_checkout_session_quote_binding() IS
  'Rejects payment-session checkout quote bindings unless every financial field matches WLT immutable quote truth.';

COMMIT;
