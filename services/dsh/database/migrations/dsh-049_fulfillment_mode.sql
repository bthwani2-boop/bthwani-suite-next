-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-049: Order Fulfillment Mode Operational Truth
-- Make fulfillment_mode an operational reality on dsh_orders, backfilled from checkout intent.

ALTER TABLE dsh_orders ADD COLUMN fulfillment_mode TEXT NOT NULL DEFAULT 'bthwani_delivery'
    CHECK (fulfillment_mode IN ('bthwani_delivery', 'partner_delivery', 'pickup'));

-- Backfill existing orders based on their original checkout intent
UPDATE dsh_orders o
SET fulfillment_mode = c.fulfillment_mode
FROM dsh_checkout_intents c
WHERE o.checkout_intent_id = c.id;

-- Ensure an index exists for operations querying by fulfillment_mode
CREATE INDEX IF NOT EXISTS idx_dsh_orders_fulfillment_mode ON dsh_orders(fulfillment_mode);
