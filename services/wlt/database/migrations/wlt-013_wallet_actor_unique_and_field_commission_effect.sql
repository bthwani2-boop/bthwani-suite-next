-- WLT-013: Unique (actor_type, actor_id) constraint on wlt_wallets so a
-- wallet can be safely upserted, and support for field-visit commissions to
-- actually post an effect to the beneficiary's wallet balance.
--
-- wlt_wallets today only has a PRIMARY KEY on id, so nothing prevents
-- duplicate rows for the same actor. Before adding the uniqueness
-- constraint, collapse any pre-existing duplicates: keep only the
-- most-recently-updated row per (actor_type, actor_id) and delete the rest.
DELETE FROM wlt_wallets
WHERE id NOT IN (
  SELECT DISTINCT ON (actor_type, actor_id) id
  FROM wlt_wallets
  ORDER BY actor_type, actor_id, updated_at DESC
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'wlt_wallets_actor_type_actor_id_key'
  ) THEN
    ALTER TABLE wlt_wallets
      ADD CONSTRAINT wlt_wallets_actor_type_actor_id_key UNIQUE (actor_type, actor_id);
  END IF;
END $$;
