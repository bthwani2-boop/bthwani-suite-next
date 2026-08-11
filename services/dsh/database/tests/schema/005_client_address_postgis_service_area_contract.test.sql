-- Verifies that client-address enforcement is bound to the effective PostGIS
-- service-area authority after the JSONB -> geometry cutover.

DO $$
DECLARE
    v_polygon_type TEXT;
    v_trigger_definition TEXT;
BEGIN
    SELECT udt_name
      INTO v_polygon_type
      FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = 'dsh_service_area_versions'
       AND column_name = 'polygon';

    IF v_polygon_type IS DISTINCT FROM 'geometry' THEN
        RAISE EXCEPTION 'dsh_service_area_versions.polygon must be PostGIS geometry, found %',
            COALESCE(v_polygon_type, '<missing>');
    END IF;

    SELECT pg_get_functiondef('dsh_enforce_client_address_service_area()'::regprocedure)
      INTO v_trigger_definition;

    IF v_trigger_definition NOT LIKE '%dsh_service_area_versions%'
       OR v_trigger_definition NOT LIKE '%ST_Contains%'
       OR v_trigger_definition LIKE '%dsh_point_in_polygon%' THEN
        RAISE EXCEPTION 'client-address trigger function is not bound to effective PostGIS service-area resolution';
    END IF;

    IF NOT EXISTS (
        SELECT 1
          FROM pg_trigger
         WHERE tgrelid = 'public.dsh_client_addresses'::regclass
           AND tgname = 'trg_dsh_client_address_service_area'
           AND NOT tgisinternal
    ) THEN
        RAISE EXCEPTION 'client-address service-area trigger is missing';
    END IF;

    IF to_regprocedure('dsh_point_in_polygon(double precision,double precision,jsonb)') IS NOT NULL THEN
        RAISE EXCEPTION 'legacy JSONB point-in-polygon function must be retired after PostGIS cutover';
    END IF;
END
$$;

SAVEPOINT client_address_postgis_contract;

INSERT INTO dsh_service_area_geofences (
    service_area_code,
    display_name,
    polygon,
    active,
    priority,
    version,
    srid,
    overlap_policy,
    effective_from
) VALUES
    (
        '__contract_address_low',
        'Contract Address Low',
        ST_GeomFromText(
            'POLYGON((44.10 15.30,44.30 15.30,44.30 15.50,44.10 15.50,44.10 15.30))',
            4326
        ),
        TRUE,
        100,
        1,
        4326,
        'priority_then_code',
        NOW()
    ),
    (
        '__contract_address_high',
        'Contract Address High',
        ST_GeomFromText(
            'POLYGON((44.10 15.30,44.30 15.30,44.30 15.50,44.10 15.50,44.10 15.30))',
            4326
        ),
        TRUE,
        200,
        1,
        4326,
        'priority_then_code',
        NOW()
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
    actor_id,
    actor_surface,
    reason,
    correlation_id
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
    '__schema_contract__',
    'system',
    'verify client address PostGIS authority',
    '__schema_contract__'
FROM dsh_service_area_geofences
WHERE service_area_code IN ('__contract_address_low', '__contract_address_high');

INSERT INTO dsh_client_addresses (
    id,
    client_id,
    label,
    recipient_name,
    phone_e164,
    address_line,
    service_area_code,
    latitude,
    longitude,
    create_idempotency_key
) VALUES (
    '__contract_address_valid',
    '__contract_client__',
    'home',
    'Contract Client',
    '+967771234567',
    'Governed PostGIS contract address',
    ' __CONTRACT_ADDRESS_HIGH ',
    15.40,
    44.20,
    '__contract_create_valid'
);

DO $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT service_area_code
      INTO v_code
      FROM dsh_client_addresses
     WHERE id = '__contract_address_valid';

    IF v_code <> '__contract_address_high' THEN
        RAISE EXCEPTION 'expected canonical winning service-area code, got %', v_code;
    END IF;
END
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_client_addresses (
            id,
            client_id,
            label,
            recipient_name,
            phone_e164,
            address_line,
            service_area_code,
            latitude,
            longitude,
            create_idempotency_key
        ) VALUES (
            '__contract_address_wrong_overlap',
            '__contract_client__',
            'work',
            'Contract Client',
            '+967771234568',
            'Lower priority overlapping service area',
            '__contract_address_low',
            15.40,
            44.20,
            '__contract_create_wrong_overlap'
        );
        RAISE EXCEPTION 'expected lower-priority overlap rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED' THEN
                RAISE;
            END IF;
    END;
END
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_client_addresses (
            id,
            client_id,
            label,
            recipient_name,
            phone_e164,
            address_line,
            service_area_code,
            latitude,
            longitude,
            create_idempotency_key
        ) VALUES (
            '__contract_address_outside',
            '__contract_client__',
            'other',
            'Contract Client',
            '+967771234569',
            'Outside governed service area',
            '__contract_address_high',
            15.80,
            44.80,
            '__contract_create_outside'
        );
        RAISE EXCEPTION 'expected outside-zone rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED' THEN
                RAISE;
            END IF;
    END;
END
$$;

ROLLBACK TO SAVEPOINT client_address_postgis_contract;
RELEASE SAVEPOINT client_address_postgis_contract;
