-- dsh-910_reel_presentation_metadata.sql
-- Requires dsh-038 and dsh-910 migrations.

DO $$
DECLARE
  missing_column TEXT;
  missing_constraint TEXT;
BEGIN
  SELECT expected.column_name INTO missing_column
  FROM (VALUES
    ('poster_asset_id'),
    ('subtitle_ar'),
    ('subtitle_en'),
    ('highlight_ar'),
    ('highlight_en'),
    ('cta_label_ar'),
    ('cta_label_en')
  ) AS expected(column_name)
  WHERE NOT EXISTS (
    SELECT 1
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = 'dsh_reels'
      AND c.column_name = expected.column_name
  )
  LIMIT 1;

  IF missing_column IS NOT NULL THEN
    RAISE EXCEPTION 'reel presentation column missing: %', missing_column;
  END IF;

  SELECT expected.constraint_name INTO missing_constraint
  FROM (VALUES
    ('ck_dsh_reels_title_lengths'),
    ('ck_dsh_reels_subtitle_lengths'),
    ('ck_dsh_reels_highlight_lengths'),
    ('ck_dsh_reels_cta_label_lengths')
  ) AS expected(constraint_name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = expected.constraint_name
  )
  LIMIT 1;

  IF missing_constraint IS NOT NULL THEN
    RAISE EXCEPTION 'reel presentation constraint missing: %', missing_constraint;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dsh_reels'::regclass
      AND contype = 'f'
      AND pg_get_constraintdef(oid) LIKE '%poster_asset_id%REFERENCES dsh_catalog_assets%'
  ) THEN
    RAISE EXCEPTION 'poster_asset_id is not governed by the DAM foreign key';
  END IF;
END;
$$;
