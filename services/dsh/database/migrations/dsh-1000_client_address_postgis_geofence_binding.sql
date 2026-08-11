-- dsh-1000_client_address_postgis_geofence_binding.sql
-- Closes the JSONB -> PostGIS cutover for client-address enforcement.
-- The database trigger must resolve the same effective service-area winner as
-- the DSH servicearea.Resolve backend path: latest effective version per code,
-- active only, ST_Contains, then priority DESC and service_area_code ASC.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_enforce_client_address_service_area()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_resolved_service_area_code TEXT;
BEGIN
    IF NEW.deleted_at IS NOT NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'DSH_ADDRESS_COORDINATES_REQUIRED';
    END IF;

    NEW.service_area_code := lower(btrim(NEW.service_area_code));

    WITH effective_versions AS (
        SELECT DISTINCT ON (service_area_code)
               service_area_code,
               polygon,
               active,
               priority,
               effective_from,
               expires_at,
               version
          FROM dsh_service_area_versions
         WHERE effective_from <= NOW()
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY service_area_code, effective_from DESC, version DESC
    )
    SELECT service_area_code
      INTO v_resolved_service_area_code
      FROM effective_versions
     WHERE active = TRUE
       AND ST_Contains(
             polygon,
             ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)
           )
     ORDER BY priority DESC, service_area_code ASC
     LIMIT 1;

    IF v_resolved_service_area_code IS NULL
       OR v_resolved_service_area_code <> NEW.service_area_code THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED';
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION dsh_enforce_client_address_service_area() IS
    'Enforces active client addresses against the effective PostGIS service-area winner used by DSH runtime resolution.';

DROP FUNCTION IF EXISTS dsh_point_in_polygon(
    DOUBLE PRECISION,
    DOUBLE PRECISION,
    JSONB
);

DO $$
DECLARE
    v_invalid_count INTEGER;
BEGIN
    WITH effective_versions AS (
        SELECT DISTINCT ON (service_area_code)
               service_area_code,
               polygon,
               active,
               priority,
               effective_from,
               expires_at,
               version
          FROM dsh_service_area_versions
         WHERE effective_from <= NOW()
           AND (expires_at IS NULL OR expires_at > NOW())
         ORDER BY service_area_code, effective_from DESC, version DESC
    ),
    resolved_addresses AS (
        SELECT
            address.id,
            lower(btrim(address.service_area_code)) AS stored_service_area_code,
            winner.service_area_code AS resolved_service_area_code
          FROM dsh_client_addresses address
          LEFT JOIN LATERAL (
              SELECT effective.service_area_code
                FROM effective_versions effective
               WHERE effective.active = TRUE
                 AND address.latitude IS NOT NULL
                 AND address.longitude IS NOT NULL
                 AND ST_Contains(
                       effective.polygon,
                       ST_SetSRID(
                           ST_MakePoint(address.longitude, address.latitude),
                           4326
                       )
                     )
               ORDER BY effective.priority DESC, effective.service_area_code ASC
               LIMIT 1
          ) winner ON TRUE
         WHERE address.deleted_at IS NULL
    )
    SELECT COUNT(*)
      INTO v_invalid_count
      FROM resolved_addresses
     WHERE resolved_service_area_code IS NULL
        OR stored_service_area_code <> resolved_service_area_code;

    IF v_invalid_count > 0 THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = format(
                'DSH_ACTIVE_CLIENT_ADDRESS_SERVICE_AREA_DRIFT: %s active address rows violate effective PostGIS service-area resolution',
                v_invalid_count
            );
    END IF;
END;
$$;

COMMIT;
