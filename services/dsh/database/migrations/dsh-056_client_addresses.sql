-- dsh-056_client_addresses.sql
-- Authenticated client-owned delivery addresses. DSH owns operational address
-- truth used by serviceability and checkout; map-provider credentials and
-- provider-specific payloads remain outside this schema.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_client_addresses (
    id                    TEXT        PRIMARY KEY DEFAULT 'addr_' || replace(gen_random_uuid()::text, '-', ''),
    client_id             TEXT        NOT NULL,
    label                 TEXT        NOT NULL CHECK (char_length(btrim(label)) BETWEEN 1 AND 80),
    recipient_name        TEXT        NOT NULL CHECK (char_length(btrim(recipient_name)) BETWEEN 2 AND 160),
    phone_e164            TEXT        NOT NULL CHECK (phone_e164 ~ '^\+[1-9][0-9]{7,14}$'),
    address_line          TEXT        NOT NULL CHECK (char_length(btrim(address_line)) BETWEEN 5 AND 500),
    service_area_code     TEXT        NOT NULL CHECK (char_length(btrim(service_area_code)) BETWEEN 1 AND 80),
    building              TEXT,
    floor                 TEXT,
    unit                  TEXT,
    delivery_instructions TEXT,
    latitude              DOUBLE PRECISION,
    longitude             DOUBLE PRECISION,
    is_default            BOOLEAN     NOT NULL DEFAULT FALSE,
    create_idempotency_key TEXT       NOT NULL,
    version               INTEGER     NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at            TIMESTAMPTZ,
    CONSTRAINT dsh_client_addresses_coordinates_pair
      CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL)),
    CONSTRAINT dsh_client_addresses_latitude_range
      CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT dsh_client_addresses_longitude_range
      CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT dsh_client_addresses_building_length
      CHECK (building IS NULL OR char_length(building) <= 120),
    CONSTRAINT dsh_client_addresses_floor_length
      CHECK (floor IS NULL OR char_length(floor) <= 40),
    CONSTRAINT dsh_client_addresses_unit_length
      CHECK (unit IS NULL OR char_length(unit) <= 40),
    CONSTRAINT dsh_client_addresses_instructions_length
      CHECK (delivery_instructions IS NULL OR char_length(delivery_instructions) <= 500),
    UNIQUE (client_id, create_idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_addresses_client_active
  ON dsh_client_addresses(client_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_client_addresses_single_default
  ON dsh_client_addresses(client_id)
  WHERE is_default = TRUE AND deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS dsh_client_address_events (
    id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    address_id     TEXT        NOT NULL,
    client_id      TEXT        NOT NULL,
    action         TEXT        NOT NULL CHECK (action IN ('created', 'updated', 'defaulted', 'deleted')),
    version        INTEGER     NOT NULL CHECK (version >= 1),
    correlation_id TEXT,
    metadata       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_client_address_events_owner
  ON dsh_client_address_events(client_id, address_id, created_at DESC);

COMMIT;
