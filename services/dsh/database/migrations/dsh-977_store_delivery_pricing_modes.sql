-- DSH-977: add pricing_mode to store delivery pricing
--
-- Adds dynamic pricing modes to support free, bthwani, partner, and zone pricing
-- models instead of relying purely on a fixed fee_minor_units value.

ALTER TABLE dsh_store_delivery_pricing
    ADD COLUMN pricing_mode TEXT NOT NULL DEFAULT 'partner_fixed_pricing'
    CHECK (pricing_mode IN ('free_delivery', 'bthwani_pricing', 'partner_fixed_pricing', 'zone_pricing'));

ALTER TABLE dsh_store_delivery_pricing
    ADD COLUMN pricing_config JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Populate pricing_mode for existing data
UPDATE dsh_store_delivery_pricing
SET pricing_mode = CASE
    WHEN fee_minor_units = 0 THEN 'free_delivery'
    WHEN fulfillment_mode = 'bthwani_delivery' THEN 'bthwani_pricing'
    ELSE 'partner_fixed_pricing'
END;

ALTER TABLE dsh_store_delivery_pricing_audit
    ADD COLUMN from_pricing_mode TEXT;
ALTER TABLE dsh_store_delivery_pricing_audit
    ADD COLUMN to_pricing_mode TEXT;
ALTER TABLE dsh_store_delivery_pricing_audit
    ADD COLUMN from_pricing_config JSONB;
ALTER TABLE dsh_store_delivery_pricing_audit
    ADD COLUMN to_pricing_config JSONB;
