BEGIN;

-- A single identity actor may legitimately belong to multiple stores owned by
-- the same partner. Uniqueness therefore belongs to the store membership
-- boundary, not to the actor globally across the platform.
ALTER TABLE dsh_store_team_members
  DROP CONSTRAINT IF EXISTS uq_dsh_store_team_members_identity_actor;

DROP INDEX IF EXISTS uq_dsh_store_team_members_identity_actor;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_store_team_members_store_identity_actor
  ON dsh_store_team_members (store_id, identity_actor_id)
  WHERE identity_actor_id IS NOT NULL AND BTRIM(identity_actor_id) <> '';

COMMIT;
