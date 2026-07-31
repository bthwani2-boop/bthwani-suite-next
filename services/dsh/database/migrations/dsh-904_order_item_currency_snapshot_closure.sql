-- DSH-904: close the immutable order-item currency snapshot after dsh-902
-- creates item_snapshot and line_total_minor_units.

BEGIN;

UPDATE dsh_order_items item
SET item_snapshot = CASE
  WHEN COALESCE(item.item_snapshot, '{}'::jsonb) = '{}'::jsonb THEN
    jsonb_build_object(
      'productId', item.product_id,
      'productName', item.product_name,
      'quantity', item.quantity,
      'unitPrice', item.unit_price,
      'currency', item.currency
    )
  ELSE jsonb_set(
    item.item_snapshot,
    '{currency}',
    to_jsonb(item.currency),
    true
  )
END
WHERE COALESCE(item.item_snapshot->>'currency', '') <> item.currency;

DO $dsh904_verify$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM dsh_order_items item
  JOIN dsh_orders order_row ON order_row.id = item.order_id
  WHERE item.currency <> order_row.currency
     OR COALESCE(item.item_snapshot->>'currency', '') <> item.currency;

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'dsh-904: % order item commercial snapshots are inconsistent', invalid_count;
  END IF;
END
$dsh904_verify$;

CREATE OR REPLACE FUNCTION dsh_apply_order_item_currency_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  order_currency TEXT;
BEGIN
  SELECT UPPER(BTRIM(currency))
  INTO order_currency
  FROM dsh_orders
  WHERE id = NEW.order_id
  FOR SHARE;

  IF NOT FOUND OR order_currency = '' OR order_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'order currency snapshot is missing or invalid';
  END IF;

  IF NEW.currency IS NOT NULL AND BTRIM(NEW.currency) <> ''
     AND UPPER(BTRIM(NEW.currency)) <> order_currency THEN
    RAISE EXCEPTION 'order item currency must equal the order pricing currency';
  END IF;

  NEW.currency := order_currency;
  NEW.item_snapshot := jsonb_set(
    COALESCE(NEW.item_snapshot, '{}'::jsonb),
    '{currency}',
    to_jsonb(order_currency),
    true
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_apply_order_item_currency ON dsh_order_items;
DROP TRIGGER IF EXISTS trg_dsh_apply_order_item_currency_snapshot ON dsh_order_items;
CREATE TRIGGER trg_dsh_apply_order_item_currency_snapshot
BEFORE INSERT ON dsh_order_items
FOR EACH ROW
EXECUTE FUNCTION dsh_apply_order_item_currency_snapshot();

CREATE OR REPLACE FUNCTION dsh_protect_order_item_commercial_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF ROW(NEW.order_id, NEW.product_id, NEW.product_name, NEW.quantity,
         NEW.unit_price, NEW.currency, NEW.item_snapshot, NEW.line_total_minor_units)
     IS DISTINCT FROM
     ROW(OLD.order_id, OLD.product_id, OLD.product_name, OLD.quantity,
         OLD.unit_price, OLD.currency, OLD.item_snapshot, OLD.line_total_minor_units) THEN
    RAISE EXCEPTION 'order item commercial snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_protect_order_item_commercial_snapshot ON dsh_order_items;
CREATE TRIGGER trg_dsh_protect_order_item_commercial_snapshot
BEFORE UPDATE ON dsh_order_items
FOR EACH ROW
EXECUTE FUNCTION dsh_protect_order_item_commercial_snapshot();

COMMIT;
