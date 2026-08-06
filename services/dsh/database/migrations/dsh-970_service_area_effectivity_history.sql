-- DSH-970: service-area SRID, deterministic overlap policy, effective ranges,
-- and immutable geometry/version history.

BEGIN;

ALTER TABLE dsh_service_area_geofences
    ADD COLUMN IF NOT EXISTS srid INTEGER NOT NULL DEFAULT 4326,
    ADD COLUMN IF NOT EXISTS overlap_policy TEXT NOT NULL DEFAULT 'priority_then_code',
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE dsh_service_area_geofences
    DROP CONSTRAINT IF EXISTS dsh_service_area_geofences_srid_check,
    ADD CONSTRAINT dsh_service_area_geofences_srid_check CHECK (srid = 4326),
    DROP CONSTRAINT IF EXISTS dsh_service_area_geofences_overlap_policy_check,
    ADD CONSTRAINT dsh_service_area_geofences_overlap_policy_check
        CHECK (overlap_policy = 'priority_then_code'),
    DROP CONSTRAINT IF EXISTS dsh_service_area_geofences_effective_range_check,
    ADD CONSTRAINT dsh_service_area_geofences_effective_range_check
        CHECK (expires_at IS NULL OR expires_at > effective_from);

CREATE INDEX IF NOT EXISTS idx_dsh_service_area_geofences_effective_resolution
    ON dsh_service_area_geofences(
        active,
        effective_from,
        expires_at,
        priority DESC,
        service_area_code ASC
    );

CREATE TABLE IF NOT EXISTS dsh_service_area_versions (
    service_area_code TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version >= 1),
    display_name TEXT NOT NULL,
    polygon JSONB NOT NULL CHECK (dsh_validate_service_area_polygon(polygon)),
    active BOOLEAN NOT NULL,
    priority INTEGER NOT NULL CHECK (priority BETWEEN 0 AND 100000),
    srid INTEGER NOT NULL CHECK (srid = 4326),
    overlap_policy TEXT NOT NULL CHECK (overlap_policy = 'priority_then_code'),
    effective_from TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    actor_id TEXT NOT NULL,
    actor_surface TEXT NOT NULL,
    reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 3 AND 500),
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (service_area_code, version),
    CHECK (expires_at IS NULL OR expires_at > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_dsh_service_area_versions_effective_resolution
    ON dsh_service_area_versions(
        service_area_code,
        effective_from DESC,
        version DESC,
        expires_at,
        active,
        priority DESC
    );

INSERT INTO dsh_service_area_versions (
    service_area_code,
    version,
    display_name,
    polygon,
    active,
    priority,
    srid,
    overlap_policy,
    effective_from,
    expires_at,
    actor_id,
    actor_surface,
    reason,
    correlation_id,
    created_at
)
SELECT
    service_area_code,
    version,
    display_name,
    polygon,
    active,
    priority,
    srid,
    overlap_policy,
    effective_from,
    expires_at,
    'migration-dsh-970',
    'system',
    'backfill governed service-area version history',
    'migration-dsh-970',
    updated_at
FROM dsh_service_area_geofences
ON CONFLICT (service_area_code, version) DO NOTHING;

CREATE OR REPLACE FUNCTION dsh_reject_service_area_version_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'DSH_SERVICE_AREA_VERSION_IMMUTABLE'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_service_area_versions_immutable
    ON dsh_service_area_versions;
CREATE TRIGGER trg_dsh_service_area_versions_immutable
BEFORE UPDATE OR DELETE ON dsh_service_area_versions
FOR EACH ROW
EXECUTE FUNCTION dsh_reject_service_area_version_mutation();

CREATE OR REPLACE FUNCTION dsh_validate_service_area_effectivity_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR NEW.effective_from IS DISTINCT FROM OLD.effective_from)
       AND NEW.effective_from < statement_timestamp() - INTERVAL '5 seconds' THEN
        RAISE EXCEPTION 'DSH_SERVICE_AREA_RETROACTIVE_EFFECTIVITY_FORBIDDEN'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_service_area_effectivity_update
    ON dsh_service_area_geofences;
CREATE TRIGGER trg_dsh_service_area_effectivity_update
BEFORE INSERT OR UPDATE OF effective_from ON dsh_service_area_geofences
FOR EACH ROW
EXECUTE FUNCTION dsh_validate_service_area_effectivity_update();

COMMENT ON COLUMN dsh_service_area_geofences.srid IS
    'EPSG SRID. DSH service-area coordinates are exclusively WGS84 longitude/latitude (4326).';
COMMENT ON COLUMN dsh_service_area_geofences.overlap_policy IS
    'Deterministic winner policy: highest priority, then lexicographically smallest service_area_code.';
COMMENT ON TABLE dsh_service_area_versions IS
    'Append-only authoritative temporal resolution history. dsh_service_area_geofences remains the latest governed command state.';

COMMIT;
