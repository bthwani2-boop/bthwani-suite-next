-- WLT-908: server-owned financial purpose and conserved payment allocation.
--
-- Two facts were previously missing from the payment session record:
--
--   1. Why the money moved. payment_method describes the rail, not the
--      accounting meaning, so nothing persisted could tell an auditor whether
--      a captured amount was an order payment, a special request or a
--      subscription purchase. Purpose is now an explicit column derived by the
--      server from the already-trusted source identity; no caller supplies it,
--      so no external client can select where value lands in the ledger.
--
--   2. What the total was made of. Without a stored breakdown the delivery fee
--      could be attributed twice by two different readers, each believing it
--      owned that component. Allocation components are now rows constrained to
--      appear at most once per session and to conserve the governed session
--      total.
--
-- Allocation is optional: a session with no components behaves exactly as it
-- did before this migration, so an older DSH that does not yet send a
-- breakdown keeps working against a newer WLT.

BEGIN;

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS financial_purpose text;

-- Backfill from the authoritative persisted source identity only. The source
-- XOR constraints added in wlt-023 and wlt-030 guarantee exactly one of these
-- is non-null, so the mapping is deterministic and involves no guesswork.
UPDATE wlt_payment_sessions
SET financial_purpose = CASE
    WHEN subscription_purchase_id IS NOT NULL THEN 'subscription_purchase'
    WHEN special_request_id IS NOT NULL THEN 'special_request_payment'
    WHEN checkout_intent_id IS NOT NULL THEN 'order_payment'
END
WHERE financial_purpose IS NULL;

-- Fail closed and loudly rather than defaulting an unclassifiable row into
-- some arbitrary purpose. A row reaching this point violates the source XOR
-- constraint and is a data defect that must be resolved deliberately.
DO $$
DECLARE
  unclassified bigint;
BEGIN
  SELECT count(*) INTO unclassified
  FROM wlt_payment_sessions
  WHERE financial_purpose IS NULL;

  IF unclassified > 0 THEN
    RAISE EXCEPTION
      'WLT-908: % payment session row(s) carry no derivable financial purpose; resolve the source identity of those rows before applying this migration',
      unclassified;
  END IF;
END $$;

ALTER TABLE wlt_payment_sessions
  ALTER COLUMN financial_purpose SET NOT NULL;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_financial_purpose_chk;

-- The payment-session edge may only hold the purposes it can actually derive
-- from a payment source. Ledger-movement purposes such as opening_balance and
-- financial_correction belong to the ledger, not to a payment session, and are
-- deliberately not accepted here.
ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_financial_purpose_chk CHECK (
    financial_purpose IN (
      'order_payment',
      'special_request_payment',
      'subscription_purchase'
    )
  );

COMMENT ON COLUMN wlt_payment_sessions.financial_purpose IS
  'Server-derived accounting meaning of the session. Derived from the trusted persisted source identity; never accepted from a caller.';

CREATE TABLE IF NOT EXISTS wlt_payment_allocation_components (
  id                  text PRIMARY KEY DEFAULT ('wpalloc_' || gen_random_uuid()::text),
  payment_session_id  text NOT NULL REFERENCES wlt_payment_sessions(id) ON DELETE RESTRICT,
  operator_context_id text NOT NULL,
  component           text NOT NULL,
  amount_minor_units  bigint NOT NULL,
  currency            text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT wlt_payment_allocation_components_component_chk CHECK (
    component IN (
      'goods_subtotal',
      'delivery_fee',
      'service_fee',
      'tax',
      'discount',
      'tip'
    )
  ),
  CONSTRAINT wlt_payment_allocation_components_operator_context_chk
    CHECK (btrim(operator_context_id) <> ''),
  CONSTRAINT wlt_payment_allocation_components_currency_chk
    CHECK (char_length(currency) = 3),
  -- A discount reduces what the payer owes and is the only component allowed
  -- to carry a negative amount; everything else adds to the total.
  CONSTRAINT wlt_payment_allocation_components_sign_chk CHECK (
    (component = 'discount' AND amount_minor_units <= 0)
    OR (component <> 'discount' AND amount_minor_units >= 0)
  )
);

-- One row per component per session. This is what makes "the delivery fee is
-- represented exactly once" a database guarantee rather than a convention.
CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_allocation_components_session_component_idx
  ON wlt_payment_allocation_components (payment_session_id, component);

CREATE INDEX IF NOT EXISTS wlt_payment_allocation_components_operator_context_idx
  ON wlt_payment_allocation_components (operator_context_id, payment_session_id);

-- Conservation cannot be expressed as a row-level CHECK because it is a
-- property of the component set, so it is enforced by a deferred constraint
-- trigger: the set is validated once at COMMIT, which lets a writer insert the
-- components in any order within its transaction while still making a
-- non-conserving set impossible to persist.
CREATE OR REPLACE FUNCTION wlt_assert_payment_allocation_conserved()
RETURNS trigger AS $$
DECLARE
  target_session   text;
  session_amount   bigint;
  session_currency text;
  allocated        bigint;
  component_count  int;
  mismatched       int;
BEGIN
  target_session := COALESCE(NEW.payment_session_id, OLD.payment_session_id);

  SELECT amount_minor_units, currency
    INTO session_amount, session_currency
  FROM wlt_payment_sessions
  WHERE id = target_session;

  -- The session itself is gone in this transaction; there is no total left to
  -- conserve against and the foreign key already governs that case.
  IF session_amount IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(sum(amount_minor_units), 0), count(*)
    INTO allocated, component_count
  FROM wlt_payment_allocation_components
  WHERE payment_session_id = target_session;

  -- Allocation is optional. Recording none is not a violation; recording an
  -- incomplete set is.
  IF component_count = 0 THEN
    RETURN NULL;
  END IF;

  SELECT count(*) INTO mismatched
  FROM wlt_payment_allocation_components
  WHERE payment_session_id = target_session
    AND currency <> session_currency;

  IF mismatched > 0 THEN
    RAISE EXCEPTION
      'WLT-908: payment allocation for session % has % component(s) in a currency other than the governed session currency %',
      target_session, mismatched, session_currency;
  END IF;

  IF allocated <> session_amount THEN
    RAISE EXCEPTION
      'WLT-908: payment allocation for session % sums to % but the governed session total is %',
      target_session, allocated, session_amount;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wlt_payment_allocation_conserved_trg
  ON wlt_payment_allocation_components;

CREATE CONSTRAINT TRIGGER wlt_payment_allocation_conserved_trg
  AFTER INSERT OR UPDATE OR DELETE ON wlt_payment_allocation_components
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION wlt_assert_payment_allocation_conserved();

COMMENT ON TABLE wlt_payment_allocation_components IS
  'Server-owned breakdown of a payment session total. Components are unique per session and must conserve the governed session amount at COMMIT.';

COMMIT;
