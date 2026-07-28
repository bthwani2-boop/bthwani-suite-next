-- WLT-108: make wallet identity tenant-local.
--
-- WLT-013 introduced a global UNIQUE(actor_type, actor_id), predating SaaS
-- tenancy. WLT-038 added tenant_id but left that global authority in place.
-- The canonical wallet identity is now (tenant_id, actor_type, actor_id), so
-- the same external actor identifier cannot couple two tenants' balances.

BEGIN;

ALTER TABLE wlt_wallets
  DROP CONSTRAINT IF EXISTS wlt_wallets_actor_type_actor_id_key;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM wlt_wallets
    GROUP BY tenant_id, actor_type, actor_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate tenant-local WLT wallets exist; reconcile before applying wlt-108';
  END IF;
END $$;

ALTER TABLE wlt_wallets
  ADD CONSTRAINT wlt_wallets_tenant_actor_key
  UNIQUE (tenant_id, actor_type, actor_id);

CREATE INDEX wlt_wallets_tenant_status_updated_idx
  ON wlt_wallets (tenant_id, status, updated_at DESC, actor_type, actor_id);

COMMENT ON CONSTRAINT wlt_wallets_tenant_actor_key ON wlt_wallets IS
  'One wallet per actor inside one tenant; identical actor ids in other tenants remain isolated.';

COMMIT;
