-- Local-only governed service-area truth for canonical Sana'a service areas.
-- The store, client-address and checkout integration path must share one DSH-owned
-- geofence instead of relying on a service_area_code label with no spatial truth.

DO $$
DECLARE
    v_now TIMESTAMPTZ := clock_timestamp();
    v_current RECORD;
    v_version INTEGER;
    v_effective_from TIMESTAMPTZ;
    r RECORD;
BEGIN
    FOR r IN (
        SELECT 'haddah' AS code, 'حدة' AS name, ST_GeomFromText('POLYGON((44.1800 15.3300,44.2000 15.3300,44.2000 15.3500,44.1800 15.3500,44.1800 15.3300))', 4326) AS poly
        UNION ALL
        SELECT 'maeen', 'معين', ST_GeomFromText('POLYGON((44.1700 15.3500,44.2100 15.3500,44.2100 15.3900,44.1700 15.3900,44.1700 15.3500))', 4326)
        UNION ALL
        SELECT 'sabeen', 'السبعين', ST_GeomFromText('POLYGON((44.1800 15.3100,44.2200 15.3100,44.2200 15.3500,44.1800 15.3500,44.1800 15.3100))', 4326)
        UNION ALL
        SELECT 'taiz-st', 'شارع تعز', ST_GeomFromText('POLYGON((44.1600 15.3000,44.2000 15.3000,44.2000 15.3400,44.1600 15.3400,44.1600 15.3000))', 4326)
        UNION ALL
        SELECT 'zubairi', 'الزبيري', ST_GeomFromText('POLYGON((44.1500 15.3400,44.1900 15.3400,44.1900 15.3800,44.1500 15.3800,44.1500 15.3400))', 4326)
        UNION ALL
        SELECT 'old-city', 'المدينة القديمة', ST_GeomFromText('POLYGON((44.1600 15.3400,44.2000 15.3400,44.2000 15.3700,44.1600 15.3700,44.1600 15.3400))', 4326)
    ) LOOP
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
        WHERE service_area_code = r.code
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
                r.code,
                r.name,
                r.poly,
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
        ELSIF v_current.display_name IS DISTINCT FROM r.name
           OR NOT ST_Equals(v_current.polygon, r.poly)
           OR v_current.active IS DISTINCT FROM TRUE
           OR v_current.priority IS DISTINCT FROM 100
           OR v_current.srid IS DISTINCT FROM 4326
           OR v_current.overlap_policy IS DISTINCT FROM 'priority_then_code'
           OR v_current.expires_at IS NOT NULL THEN
            UPDATE dsh_service_area_geofences
            SET display_name = r.name,
                polygon = r.poly,
                active = TRUE,
                priority = 100,
                version = v_current.version + 1,
                srid = 4326,
                overlap_policy = 'priority_then_code',
                effective_from = v_now,
                expires_at = NULL,
                updated_at = v_now
            WHERE service_area_code = r.code;
        END IF;

        SELECT version, effective_from
        INTO v_version, v_effective_from
        FROM dsh_service_area_geofences
        WHERE service_area_code = r.code;

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
            r.code,
            v_version,
            r.name,
            r.poly,
            TRUE,
            100,
            4326,
            'priority_then_code',
            v_effective_from,
            NULL,
            'seed:dsh-076-local-service-area',
            'system',
            'canonical local service-area fixture for ' || r.name,
            'seed:dsh-076:' || r.code || ':v' || v_version::text,
            v_now
        )
        ON CONFLICT (service_area_code, version) DO NOTHING;
    END LOOP;
END;
$$;
