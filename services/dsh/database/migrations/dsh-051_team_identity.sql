-- DSH-051: Team Identity Binding
-- Add identity_actor_id to dsh_store_team_members to enforce strict actor binding.

ALTER TABLE dsh_store_team_members
    ADD COLUMN IF NOT EXISTS identity_actor_id TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dsh_store_team_members_actor_id
    ON dsh_store_team_members(identity_actor_id);
