-- DSH-999: restore the final runtime/schema contract after late historical
-- migrations reintroduced legacy checkout states and omitted runtime-owned
-- cart and partner-onboarding columns.

BEGIN;

-- Cart price truth is represented in integer minor units at runtime. Preserve
-- existing commercial snapshots by converting the legacy decimal column once;
-- zero remains an explicit unpriced sentinel that checkout rejects closed.
ALTER TABLE dsh_cart_items
  ADD COLUMN IF NOT EXISTS unit_price_minor BIGINT NOT NULL DEFAULT 0;

UPDATE dsh_cart_items
SET unit_price_minor = ROUND(unit_price * 100)::BIGINT
WHERE unit_price_minor = 0
  AND unit_price > 0;

ALTER TABLE dsh_cart_items
  DROP CONSTRAINT IF EXISTS dsh_cart_items_unit_price_minor_chk;
ALTER TABLE dsh_cart_items
  ADD CONSTRAINT dsh_cart_items_unit_price_minor_chk
  CHECK (unit_price_minor >= 0);

-- J050 is the sole checkout state vocabulary. dsh-910 was authored against
-- the retired pre-J050 states and accidentally replaced the canonical check.
ALTER TABLE dsh_checkout_intents
  DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

UPDATE dsh_checkout_intents SET state = 'draft'      WHERE state = 'pending';
UPDATE dsh_checkout_intents SET state = 'blocked'    WHERE state = 'wlt_handoff_failed';
UPDATE dsh_checkout_intents SET state = 'confirming' WHERE state IN ('payment_pending', 'wlt_outcome_unknown');
UPDATE dsh_checkout_intents SET state = 'confirmed'  WHERE state = 'payment_confirmed';
UPDATE dsh_checkout_intents SET state = 'cancelled'  WHERE state = 'payment_failed';

ALTER TABLE dsh_checkout_intents
  ALTER COLUMN state SET DEFAULT 'draft';
ALTER TABLE dsh_checkout_intents
  ADD CONSTRAINT dsh_checkout_intents_state_check
  CHECK (state IN (
    'draft', 'validating', 'ready', 'blocked',
    'confirming', 'confirmed', 'cancelled', 'expired'
  ));

DROP INDEX IF EXISTS idx_dsh_checkout_intents_reconciliation;
CREATE INDEX idx_dsh_checkout_intents_reconciliation
  ON dsh_checkout_intents(updated_at, operator_context_id)
  WHERE state = 'confirming' AND btrim(wlt_payment_session_id) <> '';

-- The order snapshot trigger was also authored against the retired checkout
-- vocabulary. Rebind its projection to the same canonical states so new COD
-- orders cannot begin with an artificial `unknown` payment projection.
CREATE OR REPLACE FUNCTION dsh_apply_order_truth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  checkout_row RECORD;
BEGIN
  SELECT ci.delivery_address_id, ci.delivery_address, ci.state, ci.payment_method,
         ci.wlt_payment_session_id, ci.updated_at
  INTO checkout_row
  FROM dsh_checkout_intents ci
  WHERE ci.id = NEW.checkout_intent_id
    AND ci.operator_context_id = NEW.operator_context_id
  FOR SHARE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'checkout intent is outside order OperatorContext';
  END IF;

  NEW.order_number := COALESCE(NULLIF(NEW.order_number, ''),
    'ORD-' || TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYMMDD') || '-' ||
    UPPER(SUBSTRING(REPLACE(NEW.id::text, '-', '') FROM 1 FOR 12)));
  NEW.correlation_id := COALESCE(NULLIF(NEW.correlation_id, ''), 'order:' || NEW.id::text);
  NEW.delivery_address_id := checkout_row.delivery_address_id;
  NEW.delivery_address_snapshot := jsonb_strip_nulls(jsonb_build_object(
    'addressId', checkout_row.delivery_address_id,
    'formattedAddress', NULLIF(checkout_row.delivery_address, '')
  ));
  NEW.payment_status_projection := CASE
    WHEN checkout_row.state = 'confirmed' AND checkout_row.payment_method <> 'cod' THEN 'confirmed'
    WHEN checkout_row.payment_method = 'cod' AND checkout_row.state IN ('confirming', 'confirmed') THEN 'cash_due'
    ELSE 'unknown'
  END;
  NEW.payment_projection_updated_at := checkout_row.updated_at;
  NEW.payment_projection_source_updated_at := checkout_row.updated_at;
  NEW.payment_projection_reconciled_at := NOW();
  RETURN NEW;
END;
$$;

-- Governed partner creation reads and writes this case state. Keep legacy
-- partners representable as drafts, while constraining every future value to
-- the domain vocabulary implemented by the partner service.
ALTER TABLE dsh_partners
  ADD COLUMN IF NOT EXISTS onboarding_case_status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE dsh_partners
  DROP CONSTRAINT IF EXISTS dsh_partners_onboarding_case_status_check;
ALTER TABLE dsh_partners
  ADD CONSTRAINT dsh_partners_onboarding_case_status_check
  CHECK (onboarding_case_status IN (
    'draft', 'duplicate_suspected', 'validation_failed',
    'evidence_pending', 'unknown_result', 'submitted'
  ));

CREATE INDEX IF NOT EXISTS idx_dsh_partners_operator_context_onboarding_case
  ON dsh_partners(operator_context_id, onboarding_case_status, updated_at DESC);

-- Reinstall the canonical cancellation fan-out at the final migration
-- boundary so an order cannot remain terminal while dependent work stays
-- actionable in captain, partner-delivery, or pickup surfaces.
CREATE OR REPLACE FUNCTION dsh_cancel_order_dependent_work()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_reason TEXT;
BEGIN
  IF NEW.status NOT IN (
    'cancelled_by_client', 'cancelled_by_store', 'cancelled_by_operator',
    'cancelled_no_driver', 'failed_payment', 'failed_dispatch'
  ) OR OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  v_reason := COALESCE(
    NULLIF(BTRIM(NEW.cancellation_note), ''),
    NULLIF(BTRIM(NEW.cancellation_reason_code), ''),
    NEW.status
  );

  UPDATE dsh_assignments
  SET status = 'cancelled', last_latitude = NULL, last_longitude = NULL,
      location_recorded_at = NULL, updated_at = NOW()
  WHERE order_id = NEW.id AND status IN ('offered', 'accepted');

  UPDATE dsh_deliveries
  SET status = 'cancelled', note = COALESCE(NULLIF(note, ''), v_reason),
      updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('delivered', 'cancelled');

  UPDATE dsh_partner_delivery_tasks
  SET status = 'cancelled', version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status NOT IN ('completed', 'cancelled');

  UPDATE dsh_pickup_sessions
  SET status = 'cancelled', cancelled_at = COALESCE(cancelled_at, NOW()),
      cancellation_reason = COALESCE(NULLIF(cancellation_reason, ''), v_reason),
      used_at = NULL, verified_by_actor_id = NULL, verification_method = NULL,
      version = version + 1, updated_at = NOW()
  WHERE order_id = NEW.id AND status <> 'cancelled';

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_cancel_order_dependent_work ON dsh_orders;
CREATE TRIGGER trg_dsh_cancel_order_dependent_work
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_cancel_order_dependent_work();

COMMIT;
