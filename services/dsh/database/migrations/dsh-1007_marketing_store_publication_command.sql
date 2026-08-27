-- DSH-1007: Marketing-owned composite store publication command and governed overrides.

CREATE TABLE dsh_store_publication_override_policies (
  operator_context_id   TEXT        PRIMARY KEY,
  enabled               BOOLEAN     NOT NULL DEFAULT FALSE,
  allowed_blocker_codes TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
  version               INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
  updated_by            TEXT        NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (array_position(allowed_blocker_codes, '') IS NULL)
);

CREATE TABLE dsh_store_publication_decisions (
  id                   TEXT        PRIMARY KEY,
  operator_context_id  TEXT        NOT NULL,
  store_id             TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  actor_id             TEXT        NOT NULL,
  decision             TEXT        NOT NULL CHECK (decision IN ('publish','hide')),
  reason               TEXT        NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
  override_requested   BOOLEAN     NOT NULL DEFAULT FALSE,
  override_applied     BOOLEAN     NOT NULL DEFAULT FALSE,
  override_reason      TEXT        NOT NULL DEFAULT '',
  gate_blockers        JSONB       NOT NULL DEFAULT '[]'::JSONB CHECK (jsonb_typeof(gate_blockers) = 'array'),
  correlation_id       TEXT        NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (NOT override_applied OR (override_requested AND char_length(btrim(override_reason)) >= 10))
);

CREATE INDEX idx_dsh_store_publication_decisions_scope
  ON dsh_store_publication_decisions(operator_context_id, store_id, created_at DESC);

-- Every operator context starts fail-closed. Platform policy may later permit
-- named soft blockers; no publication prerequisite is bypassable without that
-- durable row.
INSERT INTO dsh_store_publication_override_policies
  (operator_context_id, enabled, allowed_blocker_codes, updated_by)
SELECT DISTINCT operator_context_id, FALSE, ARRAY[]::TEXT[], 'migration:dsh-1007'
FROM dsh_stores
WHERE btrim(operator_context_id) <> ''
ON CONFLICT (operator_context_id) DO NOTHING;
