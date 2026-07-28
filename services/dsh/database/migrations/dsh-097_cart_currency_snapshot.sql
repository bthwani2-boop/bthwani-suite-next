-- DSH-097: persist the catalog-owned currency beside every cart price snapshot.
--
-- Existing cart lines predate currency persistence. Their only trustworthy
-- recovery source is the linked dsh_store_assortments row. The migration fails
-- atomically instead of inventing a currency when that linkage is missing.

BEGIN;

ALTER TABLE dsh_cart_items
  ADD COLUMN IF NOT EXISTS currency TEXT;

UPDATE dsh_cart_items item
SET currency = UPPER(BTRIM(assortment.currency))
FROM dsh_store_assortments assortment
WHERE item.store_assortment_id = assortment.id
  AND (item.currency IS NULL OR BTRIM(item.currency) = '');

-- Compatibility recovery for rows created before store_assortment_id was
-- persisted but whose cart store + master product still identify one sovereign
-- assortment unambiguously.
UPDATE dsh_cart_items item
SET currency = UPPER(BTRIM(assortment.currency)),
    store_assortment_id = COALESCE(item.store_assortment_id, assortment.id)
FROM dsh_carts cart
JOIN dsh_store_assortments assortment
  ON assortment.store_id = cart.store_id
WHERE item.cart_id = cart.id
  AND assortment.master_product_id = item.master_product_id
  AND (item.currency IS NULL OR BTRIM(item.currency) = '');

DO $dsh097_currency_backfill$
DECLARE
  unresolved_count BIGINT;
  invalid_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO unresolved_count
  FROM dsh_cart_items
  WHERE currency IS NULL OR BTRIM(currency) = '';

  IF unresolved_count > 0 THEN
    RAISE EXCEPTION 'dsh-097: % cart item currencies cannot be recovered from sovereign store assortments', unresolved_count;
  END IF;

  SELECT COUNT(*) INTO invalid_count
  FROM dsh_cart_items
  WHERE UPPER(BTRIM(currency)) !~ '^[A-Z]{3}$';

  IF invalid_count > 0 THEN
    RAISE EXCEPTION 'dsh-097: % cart item currencies are not ISO-style three-letter codes', invalid_count;
  END IF;
END
$dsh097_currency_backfill$;

UPDATE dsh_cart_items
SET currency = UPPER(BTRIM(currency));

ALTER TABLE dsh_cart_items
  ALTER COLUMN currency SET NOT NULL;

DO $dsh097_currency_constraint$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_dsh_cart_items_currency_code'
      AND conrelid = 'dsh_cart_items'::regclass
  ) THEN
    ALTER TABLE dsh_cart_items
      ADD CONSTRAINT chk_dsh_cart_items_currency_code
      CHECK (currency = UPPER(BTRIM(currency)) AND currency ~ '^[A-Z]{3}$');
  END IF;
END
$dsh097_currency_constraint$;

COMMIT;
