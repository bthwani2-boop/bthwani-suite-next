-- dsh-080_platform_capacity_version_upgrade.sql
-- The legacy capacity table predates optimistic concurrency. Upgrade existing
-- databases explicitly; fresh databases already receive this column in dsh-077.

BEGIN;

ALTER TABLE dsh_platform_capacity_configs
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'dsh_platform_capacity_configs'::regclass
      AND conname = 'dsh_platform_capacity_configs_version_positive'
  ) THEN
    ALTER TABLE dsh_platform_capacity_configs
      ADD CONSTRAINT dsh_platform_capacity_configs_version_positive
      CHECK (version >= 1) NOT VALID;
  END IF;
END $$;

ALTER TABLE dsh_platform_capacity_configs
    VALIDATE CONSTRAINT dsh_platform_capacity_configs_version_positive;

COMMIT;
