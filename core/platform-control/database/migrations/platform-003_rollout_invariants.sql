-- PLATFORM-003: database-enforced progressive rollout invariants.

ALTER TABLE platform_rollouts
    DROP CONSTRAINT IF EXISTS platform_rollout_step_index_valid;
ALTER TABLE platform_rollouts
    ADD CONSTRAINT platform_rollout_step_index_valid
    CHECK (
        current_step_index >= -1
        AND current_step_index < cardinality(steps)
    );

CREATE OR REPLACE FUNCTION platform_prevent_baseline_restore_with_active_successor()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status IN ('aborted', 'rolled_back')
       AND OLD.status IS DISTINCT FROM NEW.status
       AND EXISTS (
           SELECT 1
           FROM platform_rollouts successor
           WHERE successor.feature_flag_key = OLD.feature_flag_key
             AND successor.id <> OLD.id
             AND successor.status IN ('running', 'paused')
       ) THEN
        RAISE EXCEPTION 'cannot restore rollout baseline while a newer active rollout exists for flag %', OLD.feature_flag_key
            USING ERRCODE = '40001';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_platform_rollout_restore_guard ON platform_rollouts;
CREATE TRIGGER trg_platform_rollout_restore_guard
BEFORE UPDATE OF status ON platform_rollouts
FOR EACH ROW
EXECUTE FUNCTION platform_prevent_baseline_restore_with_active_successor();
