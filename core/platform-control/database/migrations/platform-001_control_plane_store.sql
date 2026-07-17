-- PLATFORM-001: sovereign platform-control persistence and maker-checker workflow.
-- This database is owned exclusively by core/platform-control. DSH, WLT and
-- frontend surfaces may consume effective outcomes but must not write these
-- tables directly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS platform_variables (
    variable_key       TEXT        NOT NULL,
    owner_service      TEXT        NOT NULL,
    value_type         TEXT        NOT NULL,
    classification     TEXT        NOT NULL,
    scope_type         TEXT        NOT NULL,
    scope_id           TEXT        NOT NULL DEFAULT '',
    value_json         JSONB       NOT NULL,
    revision           BIGINT      NOT NULL DEFAULT 1 CHECK (revision > 0),
    status             TEXT        NOT NULL DEFAULT 'active'
                                  CHECK (status IN ('active','disabled','scheduled','expired')),
    effective_from     TIMESTAMPTZ,
    expires_at         TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (variable_key, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_variables_owner_scope
    ON platform_variables (owner_service, scope_type, scope_id);

CREATE TABLE IF NOT EXISTS platform_feature_flags (
    flag_key            TEXT        PRIMARY KEY,
    owner_service       TEXT        NOT NULL,
    enabled             BOOLEAN     NOT NULL DEFAULT FALSE,
    revision            BIGINT      NOT NULL DEFAULT 1 CHECK (revision > 0),
    status              TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active','disabled','scheduled','expired')),
    targeting_json      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_change_sets (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title                 TEXT        NOT NULL,
    reason                TEXT        NOT NULL,
    impact_assessment     TEXT        NOT NULL,
    rollback_plan         TEXT        NOT NULL,
    status                TEXT        NOT NULL DEFAULT 'draft'
                                     CHECK (status IN ('draft','validated','submitted','approved','rejected','applied','rolled_back','failed')),
    proposer_actor_id     TEXT        NOT NULL,
    approver_actor_id     TEXT,
    applied_by_actor_id   TEXT,
    rejected_by_actor_id  TEXT,
    rejection_reason      TEXT,
    version               BIGINT      NOT NULL DEFAULT 1 CHECK (version > 0),
    validated_at          TIMESTAMPTZ,
    submitted_at          TIMESTAMPTZ,
    approved_at           TIMESTAMPTZ,
    rejected_at           TIMESTAMPTZ,
    applied_at            TIMESTAMPTZ,
    rolled_back_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_change_sets_status_created
    ON platform_change_sets (status, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_change_set_items (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    change_set_id         UUID        NOT NULL REFERENCES platform_change_sets(id) ON DELETE CASCADE,
    target_type           TEXT        NOT NULL CHECK (target_type IN ('variable','feature_flag')),
    target_key            TEXT        NOT NULL,
    owner_service         TEXT        NOT NULL,
    scope_type            TEXT        NOT NULL DEFAULT 'global',
    scope_id              TEXT        NOT NULL DEFAULT '',
    value_type            TEXT        NOT NULL DEFAULT 'json',
    classification        TEXT        NOT NULL DEFAULT 'internal',
    expected_revision     BIGINT      NOT NULL DEFAULT 0 CHECK (expected_revision >= 0),
    before_value_json     JSONB,
    proposed_value_json   JSONB       NOT NULL,
    applied_revision      BIGINT,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (change_set_id, target_type, target_key, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_platform_change_set_items_change_set
    ON platform_change_set_items (change_set_id, created_at);

CREATE TABLE IF NOT EXISTS platform_audit_events (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    change_set_id      UUID        REFERENCES platform_change_sets(id) ON DELETE SET NULL,
    action             TEXT        NOT NULL,
    actor_id           TEXT        NOT NULL,
    actor_roles        TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    status             TEXT        NOT NULL,
    reason             TEXT        NOT NULL DEFAULT '',
    before_state_json  JSONB,
    after_state_json   JSONB,
    correlation_id     TEXT        NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_events_created
    ON platform_audit_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_events_change_set
    ON platform_audit_events (change_set_id, created_at);

COMMENT ON TABLE platform_change_sets IS
    'Maker-checker governed proposals. The proposer may not approve the same change set.';
COMMENT ON COLUMN platform_change_set_items.before_value_json IS
    'Immutable pre-apply snapshot used by rollback. It must be captured in the same transaction as apply.';
