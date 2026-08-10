-- Local-only governed service-area truth for the canonical Haddah runtime fixture.
-- The store, client-address and checkout integration path must share one DSH-owned
-- geofence instead of relying on a service_area_code label with no spatial truth.

DO $$
DECLARE
    v_polygon GEOMETRY(Polygon, 4326) := ST_GeomFromText(
        'POLYGON((44.1800 15.3300,44.2000 15.3300,44.2000 15.3500,44.1800 15.3500,44.1800 15.3300))',
        4326
    );
    v_now TIMESTAMPTZ := clock_timestamp();
    v_current RECORD;
    v_version INTEGER;
    v_effective_from TIMESTAMPTZ;
BEGIN
    SELECT
        display_name,
        polygon,
        active,
        priority,
        version,
        srid,
        overlap_policy,
        effective_from,
        expires_at
    INTO v_current
    FROM dsh_service_area_geofences
    WHERE service_area_code = 'haddah'
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO dsh_service_area_geofences (
            service_area_code,
            display_name,
            polygon,
            active,
            priority,
            version,
            created_at,
            updated_at,
            srid,
            overlap_policy,
            effective_from,
            expires_at
        ) VALUES (
            'haddah',
            'حدة',
            v_polygon,
            TRUE,
            100,
            1,
            v_now,
            v_now,
            4326,
            'priority_then_code',
            v_now,
            NULL
        );
    ELSIF v_current.display_name IS DISTINCT FROM 'حدة'
       OR NOT ST_Equals(v_current.polygon, v_polygon)
       OR v_current.active IS DISTINCT FROM TRUE
       OR v_current.priority IS DISTINCT FROM 100
       OR v_current.srid IS DISTINCT FROM 4326
       OR v_current.overlap_policy IS DISTINCT FROM 'priority_then_code'
       OR v_current.expires_at IS NOT NULL THEN
        UPDATE dsh_service_area_geofences
        SET display_name = 'حدة',
            polygon = v_polygon,
            active = TRUE,
            priority = 100,
            version = v_current.version + 1,
            srid = 4326,
            overlap_policy = 'priority_then_code',
            effective_from = v_now,
            expires_at = NULL,
            updated_at = v_now
        WHERE service_area_code = 'haddah';
    END IF;

    SELECT version, effective_from
    INTO v_version, v_effective_from
    FROM dsh_service_area_geofences
    WHERE service_area_code = 'haddah';

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
    ) VALUES (
        'haddah',
        v_version,
        'حدة',
        v_polygon,
        TRUE,
        100,
        4326,
        'priority_then_code',
        v_effective_from,
        NULL,
        'seed:dsh-076-local-service-area',
        'system',
        'canonical local Haddah service-area fixture',
        'seed:dsh-076:haddah:v' || v_version::text,
        v_now
    )
    ON CONFLICT (service_area_code, version) DO NOTHING;

    IF EXISTS (
        SELECT 1
        FROM dsh_service_area_versions
        WHERE service_area_code = 'haddah'
          AND version = v_version
          AND (
              display_name IS DISTINCT FROM 'حدة'
              OR NOT ST_Equals(polygon, v_polygon)
              OR active IS DISTINCT FROM TRUE
              OR priority IS DISTINCT FROM 100
              OR srid IS DISTINCT FROM 4326
              OR overlap_policy IS DISTINCT FROM 'priority_then_code'
              OR expires_at IS NOT NULL
          )
    ) THEN
        RAISE EXCEPTION 'DSH_LOCAL_SERVICE_AREA_VERSION_DRIFT haddah version % conflicts with canonical fixture', v_version;
    END IF;

    IF NOT ST_Contains(
        v_polygon,
        ST_SetSRID(ST_MakePoint(44.1900, 15.3400), 4326)
    ) THEN
        RAISE EXCEPTION 'DSH_LOCAL_SERVICE_AREA_FIXTURE_INVALID canonical store-test-grocery point is outside haddah';
    END IF;
END;
$$;
