\set ON_ERROR_STOP on

BEGIN;

INSERT INTO dsh_service_area_geofences (
    service_area_code,
    display_name,
    polygon,
    active,
    priority
) VALUES
    (
        'zone',
        ' verified zone',
        '[[44.10,15.30],[44.30,15.30],[44.30,15.50],[44.10,15.50]]'::jsonb,
        TRUE,
        1000
    ),
    (
        'inactive',
        ' inactive zone',
        '[[44.40,15.30],[44.60,15.30],[44.60,15.50],[44.40,15.50]]'::jsonb,
        FALSE,
        1000
    )
ON CONFLICT (service_area_code) DO UPDATE
SET display_name = EXCLUDED.display_name,
    polygon = EXCLUDED.polygon,
    active = EXCLUDED.active,
    priority = EXCLUDED.priority,
    version = dsh_service_area_geofences.version + 1,
    updated_at = NOW();

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
    'valid-address',
    'client',
    'home',
    ' Six',
    '+967771234567',
    'Verified governed address',
    ' ZONE ',
    15.40,
    44.20,
    'valid-create'
);

DO $$
DECLARE
    v_code TEXT;
BEGIN
    SELECT service_area_code
      INTO v_code
      FROM dsh_client_addresses
     WHERE id = 'valid-address';
    IF v_code <> 'zone' THEN
        RAISE EXCEPTION 'expected canonical service-area code, got %', v_code;
    END IF;
END;
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_client_addresses (
            id, client_id, label, recipient_name, phone_e164, address_line,
            service_area_code, create_idempotency_key
        ) VALUES (
            'missing-coordinates', 'client', 'missing', ' Six',
            '+967771234568', 'Missing governed coordinates', 'zone',
            'missing-create'
        );
        RAISE EXCEPTION 'expected missing-coordinate rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_COORDINATES_REQUIRED' THEN
                RAISE;
            END IF;
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_client_addresses (
            id, client_id, label, recipient_name, phone_e164, address_line,
            service_area_code, latitude, longitude, create_idempotency_key
        ) VALUES (
            'outside-zone', 'client', 'outside', ' Six',
            '+967771234569', 'Outside governed service area', 'zone',
            15.80, 44.80, 'outside-create'
        );
        RAISE EXCEPTION 'expected outside-zone rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED' THEN
                RAISE;
            END IF;
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_client_addresses (
            id, client_id, label, recipient_name, phone_e164, address_line,
            service_area_code, latitude, longitude, create_idempotency_key
        ) VALUES (
            'inactive-zone', 'client', 'inactive', ' Six',
            '+967771234570', 'Inactive governed service area', 'inactive',
            15.40, 44.50, 'inactive-create'
        );
        RAISE EXCEPTION 'expected inactive-zone rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED' THEN
                RAISE;
            END IF;
    END;
END;
$$;

DO $$
BEGIN
    BEGIN
        UPDATE dsh_client_addresses
           SET latitude = 15.80,
               longitude = 44.80
         WHERE id = 'valid-address';
        RAISE EXCEPTION 'expected update outside-zone rejection';
    EXCEPTION
        WHEN check_violation THEN
            IF SQLERRM <> 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED' THEN
                RAISE;
            END IF;
    END;
END;
$$;

UPDATE dsh_client_addresses
   SET deleted_at = NOW()
 WHERE id = 'valid-address';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
          FROM dsh_client_addresses
         WHERE id = 'valid-address'
           AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'expected governed soft delete to remain allowed';
    END IF;
END;
$$;

ROLLBACK;
