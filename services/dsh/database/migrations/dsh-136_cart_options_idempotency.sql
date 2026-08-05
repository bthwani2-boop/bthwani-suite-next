-- DSH-136: Cart Options and Idempotency
-- Implements J047 requirements: idempotency tracking, line options, and line notes.

CREATE TABLE IF NOT EXISTS dsh_cart_idempotency (
    cart_id         UUID        NOT NULL REFERENCES dsh_carts(id) ON DELETE CASCADE,
    idempotency_key TEXT        NOT NULL,
    version         INTEGER     NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (cart_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_cart_idempotency_created_at ON dsh_cart_idempotency(created_at);

ALTER TABLE dsh_cart_items
    ADD COLUMN IF NOT EXISTS options JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS options_hash TEXT NOT NULL DEFAULT '';

-- Populate empty hash for existing rows to avoid breaking the unique constraint initially
UPDATE dsh_cart_items SET options_hash = md5(options::text) WHERE options_hash = '';

-- Drop old constraint that only considered product_id
ALTER TABLE dsh_cart_items DROP CONSTRAINT IF EXISTS dsh_cart_items_cart_id_product_id_key;

-- Add new constraint that includes options_hash
ALTER TABLE dsh_cart_items ADD CONSTRAINT dsh_cart_items_identity_key UNIQUE (cart_id, master_product_id, options_hash);
