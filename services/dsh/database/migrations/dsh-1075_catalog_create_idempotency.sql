-- DSH-1075: durable request identity for Central Catalog creates.
-- The actor/operation/key tuple is the only replay identity for catalog
-- creates. The resource reference lets a replay return canonical persisted
-- truth instead of a cached or surface-local response.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_catalog_create_idempotency (
  actor_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation, idempotency_key),
  CONSTRAINT dsh_catalog_create_idempotency_key_chk
    CHECK (char_length(idempotency_key) BETWEEN 8 AND 200),
  CONSTRAINT dsh_catalog_create_idempotency_hash_chk
    CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT dsh_catalog_create_idempotency_resource_chk
    CHECK (resource_type <> '' AND resource_id <> '')
);

CREATE INDEX IF NOT EXISTS dsh_catalog_create_idempotency_created_at_idx
  ON dsh_catalog_create_idempotency (created_at);

COMMENT ON TABLE dsh_catalog_create_idempotency IS
  'Canonical replay identity and resource binding for Central Catalog create commands.';

COMMIT;
