-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-013: Platform Policies & Service Area Management

CREATE TABLE IF NOT EXISTS dsh_platform_zones (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  city_code   TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_zones_city ON dsh_platform_zones (city_code);
CREATE INDEX IF NOT EXISTS idx_dsh_zones_active ON dsh_platform_zones (is_active);

CREATE TABLE IF NOT EXISTS dsh_platform_sla_rules (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id           TEXT        NOT NULL,
  category          TEXT        NOT NULL,
  max_prep_mins     INTEGER     NOT NULL DEFAULT 30,
  max_delivery_mins INTEGER     NOT NULL DEFAULT 60,
  updated_by        TEXT,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (zone_id, category)
);

CREATE TABLE IF NOT EXISTS dsh_platform_capacity (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id               TEXT        NOT NULL UNIQUE,
  max_concurrent_orders INTEGER     NOT NULL DEFAULT 100,
  max_captains_online   INTEGER     NOT NULL DEFAULT 50,
  throttle_threshold    INTEGER     NOT NULL DEFAULT 80,
  updated_by            TEXT,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
