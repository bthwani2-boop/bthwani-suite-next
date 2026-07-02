-- DSH-017: Marketing Command Deck governance closure
-- Adds target binding, visibility-gate enforcement, soft-archive/soft-delete,
-- audit trail, and analytics tables required to close FIX_REQUIRED gaps found
-- in services/dsh/evidence/marketing-command-deck-final-closure/.

-- ── Campaigns: target + archive + actor provenance ─────────────────────────
ALTER TABLE dsh_marketing_campaigns
  ADD COLUMN IF NOT EXISTS target_type          TEXT,
  ADD COLUMN IF NOT EXISTS target_id            TEXT,
  ADD COLUMN IF NOT EXISTS audience             TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS placement            TEXT,
  ADD COLUMN IF NOT EXISTS archived_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_actor_id  TEXT,
  ADD COLUMN IF NOT EXISTS created_by_surface   TEXT NOT NULL DEFAULT 'control-panel';

ALTER TABLE dsh_marketing_campaigns
  DROP CONSTRAINT IF EXISTS dsh_marketing_campaigns_target_type_chk;
ALTER TABLE dsh_marketing_campaigns
  ADD CONSTRAINT dsh_marketing_campaigns_target_type_chk
  CHECK (target_type IS NULL OR target_type IN
    ('home','stores','store','category','subcategory','product','offer','campaign','search','custom'));

-- ── Banners: target + soft-delete + actor provenance ────────────────────────
ALTER TABLE dsh_marketing_banners
  ADD COLUMN IF NOT EXISTS target_type          TEXT,
  ADD COLUMN IF NOT EXISTS target_id            TEXT,
  ADD COLUMN IF NOT EXISTS audience             TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS placement            TEXT NOT NULL DEFAULT 'home',
  ADD COLUMN IF NOT EXISTS deleted_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_actor_id  TEXT,
  ADD COLUMN IF NOT EXISTS created_by_surface   TEXT NOT NULL DEFAULT 'control-panel';

ALTER TABLE dsh_marketing_banners
  DROP CONSTRAINT IF EXISTS dsh_marketing_banners_target_type_chk;
ALTER TABLE dsh_marketing_banners
  ADD CONSTRAINT dsh_marketing_banners_target_type_chk
  CHECK (target_type IS NULL OR target_type IN
    ('home','stores','store','category','subcategory','product','offer','campaign','search','custom'));

-- ── Promos: target + archive + actor provenance ─────────────────────────────
ALTER TABLE dsh_marketing_promos
  ADD COLUMN IF NOT EXISTS target_type          TEXT,
  ADD COLUMN IF NOT EXISTS target_id            TEXT,
  ADD COLUMN IF NOT EXISTS audience             TEXT NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS placement            TEXT,
  ADD COLUMN IF NOT EXISTS archived_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_by_actor_id  TEXT,
  ADD COLUMN IF NOT EXISTS created_by_surface   TEXT NOT NULL DEFAULT 'control-panel';

ALTER TABLE dsh_marketing_promos
  DROP CONSTRAINT IF EXISTS dsh_marketing_promos_target_type_chk;
ALTER TABLE dsh_marketing_promos
  ADD CONSTRAINT dsh_marketing_promos_target_type_chk
  CHECK (target_type IS NULL OR target_type IN
    ('home','stores','store','category','subcategory','product','offer','campaign','search','custom'));

-- ── Audit trail ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dsh_marketing_audit_events (
  id             TEXT        PRIMARY KEY,
  entity_type    TEXT        NOT NULL CHECK (entity_type IN ('campaign','banner','promo')),
  entity_id      TEXT        NOT NULL,
  actor_id       TEXT        NOT NULL,
  actor_role     TEXT        NOT NULL,
  action         TEXT        NOT NULL,
  from_state     JSONB       NOT NULL DEFAULT '{}'::jsonb,
  to_state       JSONB       NOT NULL DEFAULT '{}'::jsonb,
  reason         TEXT        NOT NULL DEFAULT '',
  correlation_id TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_audit_events_entity
  ON dsh_marketing_audit_events (entity_type, entity_id, created_at DESC);

-- ── Visibility-gate check log ────────────────────────────────────────────
-- Written every time a mutation attempts to bind target_type/target_id;
-- records why a target passed or failed the gate at that point in time.
CREATE TABLE IF NOT EXISTS dsh_marketing_visibility_gates (
  id             TEXT        PRIMARY KEY,
  entity_type    TEXT        NOT NULL CHECK (entity_type IN ('campaign','banner','promo')),
  entity_id      TEXT        NOT NULL,
  target_type    TEXT        NOT NULL,
  target_id      TEXT,
  gate           TEXT        NOT NULL,
  passed         BOOLEAN     NOT NULL,
  reason         TEXT        NOT NULL DEFAULT '',
  checked_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_visibility_gates_entity
  ON dsh_marketing_visibility_gates (entity_type, entity_id, checked_at DESC);

-- ── Target binding record ────────────────────────────────────────────────
-- One row per successfully-validated (entity, target) binding; superseded
-- bindings are left in place for audit history, latest by created_at wins.
CREATE TABLE IF NOT EXISTS dsh_marketing_target_bindings (
  id             TEXT        PRIMARY KEY,
  entity_type    TEXT        NOT NULL CHECK (entity_type IN ('campaign','banner','promo')),
  entity_id      TEXT        NOT NULL,
  target_type    TEXT        NOT NULL,
  target_id      TEXT,
  bound_by_actor_id TEXT     NOT NULL,
  correlation_id TEXT        NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_target_bindings_entity
  ON dsh_marketing_target_bindings (entity_type, entity_id, created_at DESC);

-- ── Impression / click analytics ─────────────────────────────────────────
-- Schema-only in this closure pass: no producer wired yet in app-client.
-- See marketing_visibility_gate_matrix.md / file_decision_matrix.md for the
-- FIX_REQUIRED note on client-side event emission.
CREATE TABLE IF NOT EXISTS dsh_marketing_impressions (
  id          TEXT        PRIMARY KEY,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('campaign','banner','promo')),
  entity_id   TEXT        NOT NULL,
  surface     TEXT        NOT NULL,
  viewer_ref  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_impressions_entity
  ON dsh_marketing_impressions (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_marketing_clicks (
  id          TEXT        PRIMARY KEY,
  entity_type TEXT        NOT NULL CHECK (entity_type IN ('campaign','banner','promo')),
  entity_id   TEXT        NOT NULL,
  surface     TEXT        NOT NULL,
  viewer_ref  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_marketing_clicks_entity
  ON dsh_marketing_clicks (entity_type, entity_id, created_at DESC);
