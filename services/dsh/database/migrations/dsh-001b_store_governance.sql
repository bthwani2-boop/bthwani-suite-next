-- LEGACY_FILENAME_ONLY — not a slice reference
ALTER TABLE dsh_stores
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS dsh_store_actor_scopes (
  actor_id   text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('partner', 'field', 'captain', 'operator')),
  store_id   text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  scope_type text NOT NULL CHECK (scope_type IN ('own', 'assigned', 'all')),
  active     boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, actor_role, store_id)
);

CREATE TABLE IF NOT EXISTS dsh_store_field_verifications (
  id              text PRIMARY KEY,
  store_id        text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  actor_id        text NOT NULL,
  outcome         text NOT NULL CHECK (outcome IN ('verified', 'needs_follow_up', 'rejected')),
  evidence_status text NOT NULL CHECK (evidence_status IN ('complete', 'partial', 'missing')),
  notes           text NOT NULL,
  correlation_id  text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dsh_store_pickup_readiness_reports (
  id             text PRIMARY KEY,
  store_id       text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  actor_id       text NOT NULL,
  readiness      text NOT NULL CHECK (readiness IN ('ready', 'blocked')),
  reason         text NOT NULL,
  correlation_id text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dsh_store_action_audit (
  id             text PRIMARY KEY,
  actor_id       text NOT NULL,
  actor_role     text NOT NULL,
  store_id       text NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
  action         text NOT NULL,
  from_state     jsonb NOT NULL,
  to_state       jsonb NOT NULL,
  reason         text NOT NULL,
  correlation_id text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dsh_store_idempotency (
  actor_id        text NOT NULL,
  operation       text NOT NULL,
  idempotency_key text NOT NULL,
  request_hash    text NOT NULL,
  response_body   jsonb NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id, operation, idempotency_key)
);

CREATE INDEX IF NOT EXISTS dsh_store_actor_scopes_lookup_idx
  ON dsh_store_actor_scopes(actor_id, actor_role, active, store_id);
CREATE INDEX IF NOT EXISTS dsh_store_field_verifications_store_idx
  ON dsh_store_field_verifications(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dsh_store_pickup_readiness_store_idx
  ON dsh_store_pickup_readiness_reports(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS dsh_store_action_audit_store_idx
  ON dsh_store_action_audit(store_id, created_at DESC);
