-- JRN-029: compatibility projection for operationally visible stores.
-- The source of truth remains the canonical store publication columns. This
-- generated column is read-only and cannot diverge from those columns.

BEGIN;

ALTER TABLE dsh_stores
  ADD COLUMN IF NOT EXISTS visibility_status TEXT
  GENERATED ALWAYS AS (
    CASE
      WHEN is_visible = TRUE
       AND status = 'active'
       AND serviceability_status IN ('serviceable', 'limited')
       AND partner_readiness = 'ready'
       AND catalog_approval_status = 'approved'
       AND marketing_visibility = 'visible'
      THEN 'visible'
      ELSE 'hidden'
    END
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dsh_stores'::regclass
      AND conname = 'dsh_stores_visibility_status_projection_check'
  ) THEN
    ALTER TABLE dsh_stores
      ADD CONSTRAINT dsh_stores_visibility_status_projection_check
      CHECK (visibility_status IN ('visible', 'hidden')) NOT VALID;
  END IF;
END $$;

ALTER TABLE dsh_stores
  VALIDATE CONSTRAINT dsh_stores_visibility_status_projection_check;

CREATE INDEX IF NOT EXISTS idx_dsh_stores_operational_visibility_area
  ON dsh_stores(service_area_code, visibility_status)
  WHERE visibility_status = 'visible';

COMMIT;
