-- : governed media order bindings and scan status for PoD evidence

ALTER TABLE dsh_media_refs
    ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES dsh_orders(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS scan_status TEXT NOT NULL DEFAULT 'clean',
    ADD COLUMN IF NOT EXISTS retention_until TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
    ADD COLUMN IF NOT EXISTS legal_hold BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE dsh_media_refs DROP CONSTRAINT IF EXISTS dsh_media_refs_scan_status_check;
ALTER TABLE dsh_media_refs ADD CONSTRAINT dsh_media_refs_scan_status_check
    CHECK (scan_status IN ('pending', 'clean', 'quarantined', 'failed'));

CREATE INDEX IF NOT EXISTS idx_dsh_media_refs_order_id
    ON dsh_media_refs(order_id)
    WHERE order_id IS NOT NULL;
