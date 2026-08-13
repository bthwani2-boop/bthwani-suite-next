-- DSH-1000: restore the partner team/fleet boundary on the canonical
-- dsh_captain_memberships table after dsh-990 retired the legacy team table.
-- This does not recreate dsh_store_team_members or a parallel authority.

BEGIN;

ALTER TABLE dsh_captain_memberships
  ADD COLUMN IF NOT EXISTS team_role TEXT NOT NULL DEFAULT 'staff';
ALTER TABLE dsh_captain_memberships
  DROP CONSTRAINT IF EXISTS dsh_captain_memberships_team_role_chk;
ALTER TABLE dsh_captain_memberships
  ADD CONSTRAINT dsh_captain_memberships_team_role_chk
  CHECK (team_role IN ('owner', 'supervisor', 'staff'));

ALTER TABLE dsh_captain_membership_history
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS correlation_id TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS dsh_captain_membership_history_idempotency_uidx
    ON dsh_captain_membership_history(membership_id, idempotency_key)
    WHERE btrim(idempotency_key) <> '';

DO $$
BEGIN
  IF to_regclass('dsh_partner_delivery_tasks') IS NOT NULL THEN
    ALTER TABLE dsh_partner_delivery_tasks
      DROP CONSTRAINT IF EXISTS dsh_partner_delivery_tasks_store_courier_id_fkey;
    ALTER TABLE dsh_partner_delivery_tasks
      ADD CONSTRAINT dsh_partner_delivery_tasks_store_courier_id_fkey
      FOREIGN KEY (store_courier_id) REFERENCES dsh_captain_memberships(id);
  END IF;
END $$;

-- The original fleet migration accidentally made one Captain globally unique.
-- Product Truth permits one authenticated Captain in multiple authorized stores,
-- while forbidding duplicate active membership within the same Store.
DROP INDEX IF EXISTS dsh_captain_memberships_active_uidx;
CREATE UNIQUE INDEX IF NOT EXISTS dsh_captain_memberships_active_store_uidx
    ON dsh_captain_memberships(captain_actor_id, store_id)
    WHERE status = 'active' AND btrim(captain_actor_id) <> '';

-- A retry of the same Partner invitation returns the existing pending row and
-- cannot create a second membership in the same Store.
CREATE UNIQUE INDEX IF NOT EXISTS dsh_captain_memberships_pending_identity_uidx
    ON dsh_captain_memberships(store_id, lower(btrim(captain_actor_id)))
    WHERE status = 'invited' AND btrim(captain_actor_id) <> '';

COMMIT;
