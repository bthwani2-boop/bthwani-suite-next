-- IDENTITY-023: Keep lifecycle audit values aligned with actor suspension state.
-- The lifecycle repository records operational suspension as `suspended`; the
-- original audit table predated the actor status model and only allowed the
-- historical deactivated/reactivated values.

ALTER TABLE identity_actor_lifecycle_events
  DROP CONSTRAINT IF EXISTS identity_actor_lifecycle_events_status_check;

ALTER TABLE identity_actor_lifecycle_events
  ADD CONSTRAINT identity_actor_lifecycle_events_status_check
  CHECK (status IN ('deactivated', 'suspended', 'reactivated'));
