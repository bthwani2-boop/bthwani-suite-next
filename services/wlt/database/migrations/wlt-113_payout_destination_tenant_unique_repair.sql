-- WLT-113: remove the stale global active-owner uniqueness index left by
-- WLT-098 and assert the tenant-local replacement introduced by WLT-112.
--
-- WLT-098 created wlt_payout_destinations_one_active_owner_uidx, while
-- WLT-112 attempted to drop a differently named *_idx index. The stale global
-- index prevented the same actor identity from owning payout destinations in
-- two independent tenants.
DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_uidx;
DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_idx;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payout_destinations_one_active_tenant_owner_idx
  ON wlt_payout_destinations (tenant_id, owner_actor_type, owner_actor_id)
  WHERE active = true;

DO $$
BEGIN
  IF to_regclass('public.wlt_payout_destinations_one_active_owner_uidx') IS NOT NULL
     OR to_regclass('public.wlt_payout_destinations_one_active_owner_idx') IS NOT NULL
  THEN
    RAISE EXCEPTION 'global payout destination owner uniqueness index still exists';
  END IF;

  IF to_regclass('public.wlt_payout_destinations_one_active_tenant_owner_idx') IS NULL THEN
    RAISE EXCEPTION 'tenant-local payout destination owner uniqueness index is missing';
  END IF;
END
$$;
