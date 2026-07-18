-- PLATFORM-002: governed progressive feature-flag rollouts.
-- Rollouts may only reference an applied, independently approved change set
-- containing the same feature flag. Every mutation is revision checked.

CREATE TABLE IF NOT EXISTS platform_rollouts (
    id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    change_set_id          UUID        NOT NULL REFERENCES platform_change_sets(id) ON DELETE RESTRICT,
    feature_flag_key       TEXT        NOT NULL REFERENCES platform_feature_flags(flag_key) ON DELETE RESTRICT,
    status                 TEXT        NOT NULL DEFAULT 'running'
                                      CHECK (status IN ('running','paused','completed','aborted','rolled_back','failed')),
    target_scope_json      JSONB       NOT NULL DEFAULT '{}'::jsonb,
    steps                  INTEGER[]   NOT NULL,
    current_step_index     INTEGER     NOT NULL DEFAULT -1,
    current_percentage     INTEGER     NOT NULL DEFAULT 0 CHECK (current_percentage BETWEEN 0 AND 100),
    health_gate_json       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    baseline_enabled       BOOLEAN     NOT NULL,
    baseline_targeting_json JSONB      NOT NULL DEFAULT '{}'::jsonb,
    flag_revision          BIGINT      NOT NULL CHECK (flag_revision > 0),
    created_by_actor_id    TEXT        NOT NULL,
    updated_by_actor_id    TEXT        NOT NULL,
    version                BIGINT      NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paused_at              TIMESTAMPTZ,
    completed_at           TIMESTAMPTZ,
    aborted_at             TIMESTAMPTZ,
    rolled_back_at         TIMESTAMPTZ,
    CONSTRAINT platform_rollout_steps_not_empty CHECK (cardinality(steps) > 0),
    CONSTRAINT platform_rollout_step_index_valid CHECK (current_step_index >= -1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_rollouts_active_flag
    ON platform_rollouts (feature_flag_key)
    WHERE status IN ('running','paused');

CREATE INDEX IF NOT EXISTS idx_platform_rollouts_status_updated
    ON platform_rollouts (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_rollouts_change_set
    ON platform_rollouts (change_set_id, created_at DESC);

COMMENT ON COLUMN platform_rollouts.flag_revision IS
    'Last feature-flag revision written or observed by this rollout. Advance, abort and rollback reject newer external revisions.';
COMMENT ON COLUMN platform_rollouts.baseline_targeting_json IS
    'Immutable targeting snapshot restored by abort or rollback.';
