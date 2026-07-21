-- dsh-076_service_area_geofences.sql
-- DSH-owned operational service-area truth. External map providers resolve places;
-- only these governed geofences may assign a serviceAreaCode used by checkout.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_service_area_geofences (
    service_area_code TEXT PRIMARY KEY,
    display_name TEXT NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 160),
    polygon JSONB NOT NULL CHECK (jsonb_typeof(polygon) = 'array'),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 100000),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_service_area_geofences_active_priority
    ON dsh_service_area_geofences(active, priority DESC, service_area_code)
    WHERE active = TRUE;

CREATE TABLE IF NOT EXISTS dsh_service_area_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_area_code TEXT NOT NULL REFERENCES dsh_service_area_geofences(service_area_code),
    actor_id TEXT NOT NULL,
    actor_surface TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'activated', 'deactivated')),
    from_version INTEGER,
    to_version INTEGER NOT NULL CHECK (to_version >= 1),
    reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_service_area_events_code_created
    ON dsh_service_area_events(service_area_code, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_service_area_mutation_results (
    actor_id TEXT NOT NULL,
    operation TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    request_hash TEXT NOT NULL,
    response_body JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (actor_id, operation, idempotency_key)
);

COMMIT;
