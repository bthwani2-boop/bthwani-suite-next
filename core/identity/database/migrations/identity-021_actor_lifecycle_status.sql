-- Migration: Replace 'active' boolean with 'status' and 'version' for Actor Lifecycle J003

ALTER TABLE identity_actors ADD COLUMN status text NOT NULL DEFAULT 'PROVISIONED' CHECK (status IN ('PROVISIONED', 'PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'));
ALTER TABLE identity_actors ADD COLUMN version integer NOT NULL DEFAULT 1;

-- Data Migration: Convert existing 'active' states to 'status'
UPDATE identity_actors SET status = 'ACTIVE' WHERE active = true;

-- For inactive actors, check if they have any revoked sessions. If so, they are suspended.
-- Otherwise, they might just be provisioned.
UPDATE identity_actors SET status = 'SUSPENDED' WHERE active = false AND EXISTS (SELECT 1 FROM identity_sessions WHERE actor_id = identity_actors.id);
UPDATE identity_actors SET status = 'PROVISIONED' WHERE active = false AND status != 'SUSPENDED';

-- Remove the old 'active' column
ALTER TABLE identity_actors DROP COLUMN active;
