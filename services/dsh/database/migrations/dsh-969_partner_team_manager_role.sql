-- DSH-969: align partner team role storage with the canonical Identity bundle registry.
-- The live API and Identity both support manager, but the historical DSH-050
-- table constraint omitted it. This forward-only migration repairs the schema
-- without mutating immutable migration history.

BEGIN;

ALTER TABLE dsh_store_team_members
  DROP CONSTRAINT IF EXISTS dsh_store_team_members_role_check;

ALTER TABLE dsh_store_team_members
  ADD CONSTRAINT dsh_store_team_members_role_check
  CHECK (role IN ('owner', 'manager', 'supervisor', 'staff', 'courier'));

COMMIT;
