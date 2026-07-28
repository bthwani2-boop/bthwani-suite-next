-- DSH-098: bind every order line to the order's authoritative currency.
--
-- This migration intentionally runs before dsh-902 creates item_snapshot and
-- line_total_minor_units. It therefore owns only the early currency column,
-- backfill, validation and insert-time derivation. The immutable JSON snapshot
-- closure is applied later by dsh-904 after those columns exist.

BEGIN;

ALTER TABLE dsh_order_items
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE dsh_order_items item
SET currency = UPPER(BTRIM(order_row.currency))
FROM dsh_orders order_row
WHERE order_row.id = item.order_id
  AND (item.currency IS NULL OR BTRIM(item.currency) = '');

DO $dsh098_backfill$
DECLARE
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO invalid_count
  FROM dsh_order_items item
  JOIN dsh_orders order_row ON order_row.id = item.order_id
  WHERE item.currency IS NULL
     OR BTRIM(item.currency) = ''
     OR UPPER(BTRIM(item.currency)) !~ '^[A-Z]{3}$'
     OR UPPER(BTRIM(item.currency)) <> UPPER(BTRIM(order_row.currency));

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'dsh-098: % order item currencies are unresolved or inconsistent', invalid_count;
  END IF;
END
$dsh098_backfill$;

ALTER TABLE dsh_order_items
  ALTER COLUMN currency SET NOT NULL;

DO $dsh098_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_dsh_order_items_currency_code'
      AND conrelid = 'dsh_order_items'::regclass
  ) THEN
    ALTER TABLE dsh_order_items
      ADD CONSTRAINT chk_dsh_order_items_currency_code
      CHECK (currency = UPPER(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$');
  END IF;
END
$dsh098_constraint$;

CREATE OR REPLACE FUNCTION dsh_apply_order_item_currency()
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
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_apply_order_item_currency ON dsh_order_items;
CREATE TRIGGER trg_dsh_apply_order_item_currency
BEFORE INSERT ON dsh_order_items
FOR EACH ROW
EXECUTE FUNCTION dsh_apply_order_item_currency();

COMMIT;
