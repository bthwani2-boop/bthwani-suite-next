-- DSH-022: Real numeric pricing for catalog/cart/checkout
--
-- Until now, DSH never stored a numeric price anywhere: price_reference was
-- a display-only text label (dsh-004_cart.sql, dsh-002b_storefront_catalog.sql
-- both say so explicitly), which meant checkout had no authoritative amount
-- to hand off to WLT (WLT payment sessions were created with amount 0).
--
-- This migration makes the DSH catalog/cart layer the source of the
-- numeric price snapshot used at checkout handoff. WLT remains the sole
-- owner of payment authorization/capture/settlement/refund/ledger truth;
-- this is only the commercial price DSH's own catalog sells at, which must
-- live somewhere for checkout to compute a real cart total.

ALTER TABLE dsh_catalog_products
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE dsh_catalog_products
    DROP CONSTRAINT IF EXISTS dsh_catalog_products_unit_price_chk;
ALTER TABLE dsh_catalog_products
    ADD CONSTRAINT dsh_catalog_products_unit_price_chk CHECK (unit_price >= 0);

-- Cart items snapshot the catalog price at add-to-cart time, so a later
-- catalog price change never retroactively changes an existing cart/order.
ALTER TABLE dsh_cart_items
    ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE dsh_cart_items
    DROP CONSTRAINT IF EXISTS dsh_cart_items_unit_price_chk;
ALTER TABLE dsh_cart_items
    ADD CONSTRAINT dsh_cart_items_unit_price_chk CHECK (unit_price >= 0);
