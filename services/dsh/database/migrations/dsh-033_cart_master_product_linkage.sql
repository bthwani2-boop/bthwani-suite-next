-- DSH-033: Cart master-product linkage
-- Adds sovereign central-catalog identity to cart items. Previously dsh_cart_items.product_id
-- pointed at the legacy per-store dsh_catalog_products table; carts must now reference
-- dsh_master_products (via dsh_store_assortments) instead, so a cart line always resolves
-- to the sovereign product + its store assortment row (price/availability truth).

ALTER TABLE dsh_cart_items
    ADD COLUMN IF NOT EXISTS master_product_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS store_assortment_id TEXT NULL REFERENCES dsh_store_assortments(id);

-- Existing rows (if any) were keyed by product_id against the legacy catalog; since that
-- shape and the master-product shape share the same string identity space going forward,
-- backfill master_product_id from product_id so historical rows remain queryable. Any row
-- that doesn't actually resolve to a live assortment will simply fail validation on next
-- write (UpsertItem now requires a matching dsh_store_assortments row).
UPDATE dsh_cart_items SET master_product_id = product_id WHERE master_product_id = '';

CREATE INDEX IF NOT EXISTS idx_dsh_cart_items_master_product ON dsh_cart_items(master_product_id);
