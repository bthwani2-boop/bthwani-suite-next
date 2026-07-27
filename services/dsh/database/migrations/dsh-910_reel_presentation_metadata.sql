-- DSH-910: Governed presentation metadata for approved client reels.
-- Adds the poster and localized copy used by the reels viewer. The video asset
-- remains the primary governed media truth; poster assets are optional DAM
-- images reviewed in the same approval transaction.

BEGIN;

ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS poster_asset_id TEXT REFERENCES dsh_catalog_assets(id);
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS subtitle_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS subtitle_en TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS highlight_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS highlight_en TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS cta_label_ar TEXT NOT NULL DEFAULT '';
ALTER TABLE dsh_reels
  ADD COLUMN IF NOT EXISTS cta_label_en TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS idx_dsh_reels_poster_asset
  ON dsh_reels (poster_asset_id)
  WHERE poster_asset_id IS NOT NULL;

DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_title_lengths') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_title_lengths
      CHECK (char_length(title_ar) <= 160 AND char_length(title_en) <= 160) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_subtitle_lengths') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_subtitle_lengths
      CHECK (char_length(subtitle_ar) <= 500 AND char_length(subtitle_en) <= 500) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_highlight_lengths') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_highlight_lengths
      CHECK (char_length(highlight_ar) <= 280 AND char_length(highlight_en) <= 280) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ck_dsh_reels_cta_label_lengths') THEN
    ALTER TABLE dsh_reels
      ADD CONSTRAINT ck_dsh_reels_cta_label_lengths
      CHECK (char_length(cta_label_ar) <= 80 AND char_length(cta_label_en) <= 80) NOT VALID;
  END IF;
END
$constraints$;

COMMIT;
