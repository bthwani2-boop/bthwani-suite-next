-- DSH-931 / JRN-008: preserve the pre-pause availability bit so resume is
-- deterministic and does not guess whether the assortment was sellable.

BEGIN;

ALTER TABLE dsh_store_assortments
  ADD COLUMN IF NOT EXISTS available_before_pause BOOLEAN NOT NULL DEFAULT TRUE;

UPDATE dsh_store_assortments
SET available_before_pause = available
WHERE paused_at IS NULL;

COMMIT;
