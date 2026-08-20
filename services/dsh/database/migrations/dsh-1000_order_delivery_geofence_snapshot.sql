-- DSH-1000: persist immutable delivery geofence coordinates with order truth.
-- Arrival geofencing must use the order-time address snapshot, not a mutable
-- client-address row. Legacy snapshots without coordinates remain fail-closed.
BEGIN;

CREATE OR REPLACE FUNCTION dsh_apply_order_truth()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  checkout_row RECORD;
BEGIN
  SELECT ci.delivery_address_id,
         ci.delivery_address,
         ca.latitude,
         ca.longitude,
         ci.state,
         ci.payment_method,
         ci.wlt_payment_session_id,
         ci.updated_at
  INTO checkout_row
  FROM dsh_checkout_intents ci
  LEFT JOIN dsh_client_addresses ca
    ON ca.id = ci.delivery_address_id
   AND ca.client_id = ci.client_id
  WHERE ci.id = NEW.checkout_intent_id
    AND ci.operator_context_id = NEW.operator_context_id
  FOR SHARE OF ci;

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
    'formattedAddress', NULLIF(checkout_row.delivery_address, ''),
    'latitude', checkout_row.latitude,
    'longitude', checkout_row.longitude
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

COMMENT ON FUNCTION dsh_apply_order_truth() IS
  'Creates immutable order truth, including order-time delivery geofence coordinates.';

COMMIT;
