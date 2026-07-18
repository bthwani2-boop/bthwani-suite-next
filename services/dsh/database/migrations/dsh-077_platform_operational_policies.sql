-- dsh-077_platform_operational_policies.sql
-- Restores and upgrades the DSH-owned operational policy truth consumed by the
-- sovereign control-panel surface. WLT remains the exclusive financial owner.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_platform_zones (
    id TEXT PRIMARY KEY DEFAULT 'zone_' || replace(gen_random_uuid()::text, '-', ''),
    name TEXT NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 160),
    city_code TEXT NOT NULL CHECK (char_length(btrim(city_code)) BETWEEN 1 AND 80),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    description TEXT NOT NULL DEFAULT '' CHECK (char_length(description) <= 1000),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE dsh_platform_zones ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_platform_zones ADD CONSTRAINT dsh_platform_zones_version_positive CHECK (version >= 1) NOT VALID;
ALTER TABLE dsh_platform_zones VALIDATE CONSTRAINT dsh_platform_zones_version_positive;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_platform_zones_city_name
    ON dsh_platform_zones(lower(city_code), lower(name));
CREATE INDEX IF NOT EXISTS idx_dsh_platform_zones_active_city
    ON dsh_platform_zones(is_active, city_code, name);

CREATE TABLE IF NOT EXISTS dsh_platform_sla_rules (
    id TEXT PRIMARY KEY DEFAULT 'sla_' || replace(gen_random_uuid()::text, '-', ''),
    zone_id TEXT NOT NULL REFERENCES dsh_platform_zones(id),
    category TEXT NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 120),
    max_prep_mins INTEGER NOT NULL CHECK (max_prep_mins BETWEEN 1 AND 1440),
    max_delivery_mins INTEGER NOT NULL CHECK (max_delivery_mins BETWEEN 1 AND 1440),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (zone_id, category)
);
ALTER TABLE dsh_platform_sla_rules ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_platform_sla_rules ADD CONSTRAINT dsh_platform_sla_rules_version_positive CHECK (version >= 1) NOT VALID;
ALTER TABLE dsh_platform_sla_rules VALIDATE CONSTRAINT dsh_platform_sla_rules_version_positive;

CREATE INDEX IF NOT EXISTS idx_dsh_platform_sla_rules_zone
    ON dsh_platform_sla_rules(zone_id, category);

CREATE TABLE IF NOT EXISTS dsh_platform_capacity_configs (
    id TEXT PRIMARY KEY DEFAULT 'capacity_' || replace(gen_random_uuid()::text, '-', ''),
    zone_id TEXT NOT NULL UNIQUE REFERENCES dsh_platform_zones(id),
    max_concurrent_orders INTEGER NOT NULL CHECK (max_concurrent_orders BETWEEN 1 AND 1000000),
    max_captains_online INTEGER NOT NULL CHECK (max_captains_online BETWEEN 0 AND 1000000),
    throttle_threshold DOUBLE PRECISION NOT NULL CHECK (throttle_threshold BETWEEN 0 AND 1),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    updated_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE dsh_platform_store_onboarding_fee_policy
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE dsh_platform_store_onboarding_fee_policy
    ADD CONSTRAINT dsh_platform_store_onboarding_fee_version_positive CHECK (version >= 1) NOT VALID;
ALTER TABLE dsh_platform_store_onboarding_fee_policy
    VALIDATE CONSTRAINT dsh_platform_store_onboarding_fee_version_positive;

CREATE TABLE IF NOT EXISTS dsh_platform_policy_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_type TEXT NOT NULL CHECK (aggregate_type IN ('zone', 'sla_rule', 'capacity_config', 'store_onboarding_fee')),
    aggregate_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated')),
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
