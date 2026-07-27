-- DSH-911: Enforce partner/store ownership shape at the persistence boundary.
-- HTTP authorization verifies actor ownership; these constraints prevent a
-- malformed or bypassed write from creating a partner reel without a source
-- store or pointing a store-target reel at a different store.

BEGIN;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_partner_source_store_required') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_partner_source_store_required
      CHECK (submitted_by_role <> 'partner' OR source_store_id IS NOT NULL) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_store_target_matches_source') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_store_target_matches_source
      CHECK (target_type <> 'store' OR source_store_id = target_id) NOT VALID;
  END IF;
END
$constraints$;

COMMIT;
