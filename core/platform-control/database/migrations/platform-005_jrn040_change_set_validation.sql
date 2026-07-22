-- PLATFORM-005 / JRN-040: immutable validation snapshots for governed change sets.
-- A change set may advance only while the target revision and full target state
-- still match the snapshot captured by the validate transition.

ALTER TABLE platform_change_set_items
    ADD COLUMN IF NOT EXISTS validated_value_json JSONB;

ALTER TABLE platform_change_set_items
    ADD COLUMN IF NOT EXISTS validated_revision BIGINT
        CHECK (validated_revision IS NULL OR validated_revision >= 0);

ALTER TABLE platform_change_set_items
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_platform_change_set_items_target_reservation
    ON platform_change_set_items
       (target_type, target_key, scope_type, scope_id, change_set_id);

COMMENT ON COLUMN platform_change_set_items.validated_value_json IS
    'Full target-state snapshot captured atomically during JRN-040 validation; compared again before submit, approval, and apply.';

COMMENT ON COLUMN platform_change_set_items.validated_revision IS
    'Target revision observed during validation. Zero represents a target that did not yet exist.';

COMMENT ON COLUMN platform_change_set_items.validated_at IS
    'Timestamp at which the target precondition snapshot was captured.';
