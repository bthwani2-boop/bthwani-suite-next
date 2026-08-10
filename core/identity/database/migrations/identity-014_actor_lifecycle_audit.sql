CREATE TABLE IF NOT EXISTS identity_actor_lifecycle_events (
  id                  text PRIMARY KEY,
  actor_id            text NOT NULL REFERENCES identity_actors(id) ON DELETE CASCADE,
  status              text NOT NULL CHECK (status IN ('deactivated', 'reactivated')),
  reason              text NOT NULL,
  correlation_id      text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS identity_actor_lifecycle_events_actor_idx
  ON identity_actor_lifecycle_events(actor_id, created_at DESC);
