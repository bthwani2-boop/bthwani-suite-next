-- dsh-911_reel_partner_scope_constraints.sql
-- Requires dsh-038 and dsh-911 migrations.

DO $$
DECLARE
  missing_constraint TEXT;
BEGIN
  SELECT expected.name INTO missing_constraint
  FROM (VALUES
    ('ck_dsh_reels_partner_source_store_required'),
    ('ck_dsh_reels_store_target_matches_source')
  ) AS expected(name)
  WHERE NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = expected.name)
  LIMIT 1;

  IF missing_constraint IS NOT NULL THEN
    RAISE EXCEPTION 'reel partner scope constraint missing: %', missing_constraint;
  END IF;
END;
$$;
