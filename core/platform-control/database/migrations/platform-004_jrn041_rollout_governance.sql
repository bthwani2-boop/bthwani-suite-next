-- PLATFORM-004 / JRN-041: explicit target scope, health gate, and lifecycle invariants.
-- NOT VALID preserves historical rows while enforcing every new or changed row.

ALTER TABLE platform_rollouts
    ADD CONSTRAINT platform_rollout_target_scope_governed
    CHECK (
        jsonb_typeof(target_scope_json) = 'object'
        AND target_scope_json <> '{}'::jsonb
        AND (target_scope_json - ARRAY['audience', 'audienceIds', 'city', 'regions', 'surface', 'surfaces']::text[]) = '{}'::jsonb
        AND (
            NULLIF(BTRIM(target_scope_json ->> 'audience'), '') IS NOT NULL
            OR NULLIF(BTRIM(target_scope_json ->> 'city'), '') IS NOT NULL
            OR NULLIF(BTRIM(target_scope_json ->> 'surface'), '') IS NOT NULL
            OR jsonb_array_length(CASE WHEN jsonb_typeof(target_scope_json -> 'audienceIds') = 'array' THEN target_scope_json -> 'audienceIds' ELSE '[]'::jsonb END) > 0
            OR jsonb_array_length(CASE WHEN jsonb_typeof(target_scope_json -> 'regions') = 'array' THEN target_scope_json -> 'regions' ELSE '[]'::jsonb END) > 0
            OR jsonb_array_length(CASE WHEN jsonb_typeof(target_scope_json -> 'surfaces') = 'array' THEN target_scope_json -> 'surfaces' ELSE '[]'::jsonb END) > 0
        )
    ) NOT VALID;

ALTER TABLE platform_rollouts
    ADD CONSTRAINT platform_rollout_health_gate_governed
    CHECK (
        jsonb_typeof(health_gate_json) = 'object'
        AND health_gate_json ->> 'requiredState' = 'OPERATIONAL'
        AND (
            NOT (health_gate_json ? 'requiredServices')
            OR (
                jsonb_typeof(health_gate_json -> 'requiredServices') = 'array'
                AND jsonb_array_length(health_gate_json -> 'requiredServices') > 0
            )
        )
        AND CASE
            WHEN NOT (health_gate_json ? 'maxLatencyMs') THEN TRUE
            WHEN jsonb_typeof(health_gate_json -> 'maxLatencyMs') <> 'number' THEN FALSE
            ELSE (health_gate_json ->> 'maxLatencyMs')::numeric > 0
        END
    ) NOT VALID;

ALTER TABLE platform_rollouts
    ADD CONSTRAINT platform_rollout_terminal_state_consistency
    CHECK (
        (status <> 'paused' OR paused_at IS NOT NULL)
        AND (status <> 'completed' OR (completed_at IS NOT NULL AND current_percentage = 100))
        AND (status <> 'aborted' OR aborted_at IS NOT NULL)
        AND (status <> 'rolled_back' OR rolled_back_at IS NOT NULL)
        AND (status NOT IN ('aborted', 'rolled_back') OR current_percentage BETWEEN 0 AND 100)
    ) NOT VALID;

COMMENT ON CONSTRAINT platform_rollout_target_scope_governed ON platform_rollouts IS
    'JRN-041 rollout scope must use an explicit governed audience, region, city or surface selector.';
COMMENT ON CONSTRAINT platform_rollout_health_gate_governed ON platform_rollouts IS
    'JRN-041 every rollout must require OPERATIONAL health before progression.';
COMMENT ON CONSTRAINT platform_rollout_terminal_state_consistency ON platform_rollouts IS
    'JRN-041 lifecycle timestamps and completed percentage must match the persisted rollout status.';
