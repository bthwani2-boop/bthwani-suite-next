ALTER TABLE identity_actor_lifecycle_events
  ADD COLUMN IF NOT EXISTS requested_by_actor_id text;

UPDATE identity_actor_lifecycle_events
SET requested_by_actor_id = COALESCE(NULLIF(btrim(requested_by_actor_id), ''), 'legacy-unknown'),
    reason = CASE WHEN btrim(reason) = '' THEN 'legacy lifecycle transition' ELSE btrim(reason) END,
    correlation_id = COALESCE(NULLIF(btrim(correlation_id), ''), 'legacy:' || id);

ALTER TABLE identity_actor_lifecycle_events
  ALTER COLUMN requested_by_actor_id SET NOT NULL,
  ALTER COLUMN correlation_id SET NOT NULL;

ALTER TABLE identity_actor_lifecycle_events
  DROP CONSTRAINT IF EXISTS identity_actor_lifecycle_reason_nonblank_chk,
  DROP CONSTRAINT IF EXISTS identity_actor_lifecycle_correlation_nonblank_chk,
  ADD CONSTRAINT identity_actor_lifecycle_reason_nonblank_chk
    CHECK (btrim(reason) <> ''),
  ADD CONSTRAINT identity_actor_lifecycle_correlation_nonblank_chk
    CHECK (btrim(correlation_id) <> '');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'identity_actor_lifecycle_requester_fk'
      AND conrelid = 'identity_actor_lifecycle_events'::regclass
  ) THEN
    ALTER TABLE identity_actor_lifecycle_events
      ADD CONSTRAINT identity_actor_lifecycle_requester_fk
      FOREIGN KEY (requested_by_actor_id)
      REFERENCES identity_actors(id)
      NOT VALID;
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS identity_actor_lifecycle_idempotency_idx
  ON identity_actor_lifecycle_events (actor_id, status, correlation_id);
