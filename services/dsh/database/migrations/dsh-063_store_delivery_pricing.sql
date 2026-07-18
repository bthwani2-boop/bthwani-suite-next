-- DSH-063: governed delivery pricing per store and fulfillment mode.
-- The previous app-client 950 YER fixture is migrated once as an explicit
-- policy; all future checkout totals read this table before WLT handoff.

CREATE TABLE IF NOT EXISTS dsh_store_delivery_pricing (
    store_id                 TEXT NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    fulfillment_mode        TEXT NOT NULL
                            CHECK (fulfillment_mode IN ('bthwani_delivery','partner_delivery','pickup')),
    fee_minor_units         BIGINT NOT NULL DEFAULT 0 CHECK (fee_minor_units>=0),
    currency                TEXT NOT NULL DEFAULT 'YER',
    status                  TEXT NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','paused','archived')),
    pricing_source          TEXT NOT NULL DEFAULT 'control_panel'
                            CHECK (pricing_source IN ('control_panel','partner_store','platform_default','migration_legacy')),
    created_by_actor_id     TEXT NOT NULL DEFAULT '',
    approved_by_actor_id    TEXT NOT NULL DEFAULT '',
    approved_at             TIMESTAMPTZ,
    version                 INTEGER NOT NULL DEFAULT 1 CHECK (version>0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (store_id,fulfillment_mode)
);

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'bthwani_delivery',CASE WHEN s.is_free_delivery THEN 0 ELSE 95000 END,
       'YER','active','migration_legacy','migration:dsh-063','migration:dsh-063',NOW()
FROM dsh_stores s
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'partner_delivery',
       CASE WHEN COALESCE(cs.policy,'free_delivery')='free_delivery' OR s.is_free_delivery THEN 0 ELSE 95000 END,
       'YER','active','migration_legacy','migration:dsh-063','migration:dsh-063',NOW()
FROM dsh_stores s
LEFT JOIN dsh_store_courier_settings cs ON cs.store_id=s.id
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

INSERT INTO dsh_store_delivery_pricing
    (store_id,fulfillment_mode,fee_minor_units,currency,status,pricing_source,
     created_by_actor_id,approved_by_actor_id,approved_at)
SELECT s.id,'pickup',0,'YER','active','platform_default',
       'migration:dsh-063','migration:dsh-063',NOW()
FROM dsh_stores s
ON CONFLICT (store_id,fulfillment_mode) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_dsh_store_delivery_pricing_status
    ON dsh_store_delivery_pricing(status,fulfillment_mode);

COMMENT ON TABLE dsh_store_delivery_pricing IS
    'Sovereign DSH delivery-fee source consumed by checkout before WLT handoff.';
