-- Migration: dsh-991_eradicate_store_team_members
-- Description: Permanently drop the legacy partner team management tables that were superseded by Workforce.
-- J014/J022

BEGIN;

DROP TABLE IF EXISTS dsh_store_team_member_actions CASCADE;
DROP TABLE IF EXISTS dsh_store_team_members CASCADE;

COMMIT;
