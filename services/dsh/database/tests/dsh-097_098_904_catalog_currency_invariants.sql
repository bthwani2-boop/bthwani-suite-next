\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_suffix text := replace(gen_random_uuid()::text, '-', '');
  v_store_id text := 'currency-store-' || v_suffix;
  v_client_id text := 'currency-client-' || v_suffix;
  v_operator_context_id text := 'currency-OperatorContext-' || v_suffix;
  v_cart_id uuid;
  v_checkout_id uuid;
  v_order_id uuid;
  v_item_currency text;
  v_snapshot_currency text;
  v_rejected boolean := false;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_cart_items'
      AND column_name = 'currency'
      AND is_nullable <> 'NO'
  ) THEN
    RAISE EXCEPTION 'dsh_cart_items.currency must be NOT NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'dsh_order_items'
      AND column_name = 'currency'
      AND is_nullable <> 'NO'
  ) THEN
    RAISE EXCEPTION 'dsh_order_items.currency must be NOT NULL';
  END IF;

  INSERT INTO dsh_stores (
    id, slug, display_name, status, city_code, service_area_code,
    serviceability_status, is_visible
  ) VALUES (
    v_store_id, v_store_id, 'Currency Invariant Store', 'active',
    'SAN', 'SAN-1', 'serviceable', TRUE
  );

  INSERT INTO dsh_carts (client_id, store_id, fulfillment_mode, state)
  VALUES (v_client_id, v_store_id, 'pickup', 'active')
  RETURNING id INTO v_cart_id;

  INSERT INTO dsh_cart_items (
    cart_id, product_id, product_name, price_reference,
    unit_price, currency, quantity
  ) VALUES (
    v_cart_id, 'currency-product', 'Currency Product',
    '25.50 USD', 25.50, 'USD', 2
  );

  INSERT INTO dsh_checkout_intents (
    operator_context_id, client_id, cart_id, store_id, state, fulfillment_mode,
    payment_method, wlt_payment_session_id,
    subtotal_minor_units, delivery_fee_minor_units, discount_minor_units,
    total_minor_units, currency, pricing_snapshot_hash
  ) VALUES (
    v_operator_context_id, v_client_id, v_cart_id, v_store_id,
    'payment_pending', 'pickup', 'cod', 'currency-session-' || v_suffix,
    5100, 0, 0, 5100, 'USD', repeat('c', 64)
  ) RETURNING id INTO v_checkout_id;

  INSERT INTO dsh_orders (
    operator_context_id, checkout_intent_id, store_id, fulfillment_mode,
    client_id, status, wlt_payment_ref_id
  ) VALUES (
    v_operator_context_id, v_checkout_id, v_store_id, 'pickup',
    v_client_id, 'pending', 'currency-session-' || v_suffix
  ) RETURNING id INTO v_order_id;

  INSERT INTO dsh_order_items (
    order_id, product_id, product_name, quantity, unit_price
  ) VALUES (
    v_order_id, 'currency-product', 'Currency Product', 2, 25.50
  );

  SELECT currency, item_snapshot->>'currency'
  INTO v_item_currency, v_snapshot_currency
  FROM dsh_order_items
  WHERE order_id = v_order_id;

  IF v_item_currency <> 'USD' OR v_snapshot_currency <> 'USD' THEN
    RAISE EXCEPTION 'order item currency snapshot mismatch: column=% snapshot=%',
      v_item_currency, v_snapshot_currency;
  END IF;

  BEGIN
    UPDATE dsh_order_items
    SET currency = 'EUR'
    WHERE order_id = v_order_id;
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'order item commercial currency snapshot was mutable';
  END IF;

  v_rejected := false;
  BEGIN
    INSERT INTO dsh_order_items (
      order_id, product_id, product_name, quantity, unit_price, currency
    ) VALUES (
      v_order_id, 'currency-product-2', 'Currency Product 2', 1, 10.00, 'EUR'
    );
  EXCEPTION WHEN OTHERS THEN
    v_rejected := true;
  END;

  IF NOT v_rejected THEN
    RAISE EXCEPTION 'order item accepted a currency different from the order';
  END IF;
END $$;

ROLLBACK;
