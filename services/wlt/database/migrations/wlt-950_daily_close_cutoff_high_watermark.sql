-- WLT-950: bind a daily finance close to an immutable database cutoff.
-- The cutoff is captured inside the close transaction and is the upper bound
-- for all close inputs. Historical rows are retained but remain unqualified
-- until their source proof is independently available.

BEGIN;

ALTER TABLE wlt_daily_finance_close
  ADD COLUMN IF NOT EXISTS cutoff_at timestamptz,
  ADD COLUMN IF NOT EXISTS input_high_watermark jsonb;

UPDATE wlt_daily_finance_close
SET cutoff_at = COALESCE(cutoff_at, closed_at),
    input_high_watermark = COALESCE(input_high_watermark, '{}'::jsonb)
WHERE cutoff_at IS NULL OR input_high_watermark IS NULL;

ALTER TABLE wlt_daily_finance_close
  ALTER COLUMN cutoff_at SET NOT NULL,
  ALTER COLUMN input_high_watermark SET NOT NULL;

COMMENT ON COLUMN wlt_daily_finance_close.cutoff_at IS
  'Immutable database timestamp captured by the close transaction; all included facts must be at or before this cutoff.';
COMMENT ON COLUMN wlt_daily_finance_close.input_high_watermark IS
  'Immutable source high-watermark summary captured with the close; it is evidence metadata, not a second financial authority.';

COMMIT;
