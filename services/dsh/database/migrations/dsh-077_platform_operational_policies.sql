-- dsh-077_platform_operational_policies.sql
-- Restores and upgrades the DSH-owned operational policy truth consumed by the
-- sovereign control-panel surface. WLT remains the exclusive financial owner.
--
-- PRE-RELEASE AMENDMENT: dsh-013 created UUID zone identities and a legacy
-- dsh_platform_capacity table. The previous form of this migration introduced
-- incompatible TEXT foreign keys and a second capacity source. This version
-- performs a deterministic in-transaction upgrade and data migration. See
-- governance/database/migration-amendments.json.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_platform_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    city_code TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NOT NULL DEFAULT '',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dsh_platform_zones
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
UPDATE dsh_platform_zones SET description = '' WHERE description IS NULL;
ALTER TABLE dsh_platform_zones
    ALTER COLUMN description SET DEFAULT '',
    ALTER COLUMN description SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_zones'::regclass
      AND conname = 'dsh_platform_zones_version_positive'
  ) THEN
    ALTER TABLE dsh_platform_zones
      ADD CONSTRAINT dsh_platform_zones_version_positive CHECK (version >= 1) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_zones'::regclass
      AND conname = 'dsh_platform_zones_name_length'
  ) THEN
    ALTER TABLE dsh_platform_zones
      ADD CONSTRAINT dsh_platform_zones_name_length
      CHECK (char_length(btrim(name)) BETWEEN 2 AND 160) NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_zones'::regclass
      AND conname = 'dsh_platform_zones_city_code_length'
  ) THEN
    ALTER TABLE dsh_platform_zones
      ADD CONSTRAINT dsh_platform_zones_city_code_length
      CHECK (char_length(btrim(city_code)) BETWEEN 1 AND 80) NOT VALID;
  END IF;
END $$;

ALTER TABLE dsh_platform_zones
    VALIDATE CONSTRAINT dsh_platform_zones_version_positive,
    VALIDATE CONSTRAINT dsh_platform_zones_name_length,
    VALIDATE CONSTRAINT dsh_platform_zones_city_code_length;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_platform_zones_city_name
    ON dsh_platform_zones(lower(city_code), lower(name));
CREATE INDEX IF NOT EXISTS idx_dsh_platform_zones_active_city
    ON dsh_platform_zones(is_active, city_code, name);

CREATE TABLE IF NOT EXISTS dsh_platform_sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL REFERENCES dsh_platform_zones(id) ON DELETE RESTRICT,
    category TEXT NOT NULL,
    max_prep_mins INTEGER NOT NULL DEFAULT 30,
    max_delivery_mins INTEGER NOT NULL DEFAULT 60,
    version INTEGER NOT NULL DEFAULT 1,
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (zone_id, category)
);

ALTER TABLE dsh_platform_sla_rules
    ALTER COLUMN zone_id TYPE UUID USING zone_id::uuid,
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
UPDATE dsh_platform_sla_rules
SET updated_by = 'migration:dsh-077'
WHERE updated_by IS NULL OR btrim(updated_by) = '';
ALTER TABLE dsh_platform_sla_rules
    ALTER COLUMN updated_by SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_sla_rules'::regclass
      AND conname = 'dsh_platform_sla_rules_zone_fk'
  ) THEN
    ALTER TABLE dsh_platform_sla_rules
      ADD CONSTRAINT dsh_platform_sla_rules_zone_fk
      FOREIGN KEY (zone_id) REFERENCES dsh_platform_zones(id) ON DELETE RESTRICT NOT VALID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_sla_rules'::regclass
      AND conname = 'dsh_platform_sla_rules_bounds'
  ) THEN
    ALTER TABLE dsh_platform_sla_rules
      ADD CONSTRAINT dsh_platform_sla_rules_bounds CHECK (
        char_length(btrim(category)) BETWEEN 1 AND 120
        AND max_prep_mins BETWEEN 1 AND 1440
        AND max_delivery_mins BETWEEN 1 AND 1440
        AND version >= 1
      ) NOT VALID;
  END IF;
END $$;

ALTER TABLE dsh_platform_sla_rules
    VALIDATE CONSTRAINT dsh_platform_sla_rules_zone_fk,
    VALIDATE CONSTRAINT dsh_platform_sla_rules_bounds;

CREATE INDEX IF NOT EXISTS idx_dsh_platform_sla_rules_zone
    ON dsh_platform_sla_rules(zone_id, category);

CREATE TABLE IF NOT EXISTS dsh_platform_capacity_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_id UUID NOT NULL UNIQUE REFERENCES dsh_platform_zones(id) ON DELETE RESTRICT,
    max_concurrent_orders INTEGER NOT NULL CHECK (max_concurrent_orders BETWEEN 1 AND 1000000),
    max_captains_online INTEGER NOT NULL CHECK (max_captains_online BETWEEN 0 AND 1000000),
    throttle_threshold DOUBLE PRECISION NOT NULL CHECK (throttle_threshold BETWEEN 0 AND 1),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF to_regclass('public.dsh_platform_capacity') IS NOT NULL THEN
    INSERT INTO dsh_platform_capacity_configs (
      id,
      zone_id,
      max_concurrent_orders,
      max_captains_online,
      throttle_threshold,
      version,
      updated_by,
      created_at,
      updated_at
    )
    SELECT
      id,
      zone_id::uuid,
      max_concurrent_orders,
      max_captains_online,
      LEAST(1.0, GREATEST(0.0, throttle_threshold::double precision / 100.0)),
      1,
      COALESCE(NULLIF(btrim(updated_by), ''), 'migration:dsh-077'),
      updated_at,
      updated_at
    FROM dsh_platform_capacity
    ON CONFLICT (zone_id) DO NOTHING;
  END IF;
END $$;

DROP TABLE IF EXISTS dsh_platform_capacity;

ALTER TABLE dsh_platform_store_onboarding_fee_policy
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'dsh_platform_store_onboarding_fee_policy'::regclass
      AND conname = 'dsh_platform_store_onboarding_fee_version_positive'
  ) THEN
    ALTER TABLE dsh_platform_store_onboarding_fee_policy
      ADD CONSTRAINT dsh_platform_store_onboarding_fee_version_positive
      CHECK (version >= 1) NOT VALID;
  END IF;
END $$;
ALTER TABLE dsh_platform_store_onboarding_fee_policy
    VALIDATE CONSTRAINT dsh_platform_store_onboarding_fee_version_positive;

CREATE TABLE IF NOT EXISTS dsh_platform_policy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL CHECK (
      aggregate_type IN ('zone', 'sla_rule', 'capacity_config', 'store_onboarding_fee')
    ),
    aggregate_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (
      action IN ('created', 'updated', 'activated', 'deactivated')
    ),
    actor_id TEXT NOT NULL,
    actor_surface TEXT NOT NULL,
    correlation_id TEXT,
    reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
    from_version INTEGER,
    to_version INTEGER NOT NULL CHECK (to_version >= 1),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_platform_policy_events_aggregate
    ON dsh_platform_policy_events(aggregate_type, aggregate_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_platform_policy_mutation_results (
    actor_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (actor_id, operation, idempotency_key)
);

COMMIT;
