-- DSH-035: Field verification evidence snapshots.
-- Keeps field verification decisions auditable against the checklist state
-- used at submission time.

ALTER TABLE dsh_store_field_verifications
  ADD COLUMN IF NOT EXISTS checklist_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS location_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb;
