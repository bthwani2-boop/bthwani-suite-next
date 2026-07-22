-- dsh-907_jrn_006_service_area_topology.sql
-- Requires dsh-076 and dsh-907 migrations.

BEGIN;

INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon, active, priority)
VALUES (
    'jrn006-valid-topology',
    'Valid topology',
    '[[44.10,15.30],[44.30,15.30],[44.30,15.50],[44.10,15.50]]'::jsonb,
    TRUE,
    100
);

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon)
        VALUES ('jrn006-self-intersection', 'Self intersection', '[[44.10,15.30],[44.30,15.50],[44.30,15.30],[44.10,15.50]]'::jsonb);
        RAISE EXCEPTION 'expected self-intersecting polygon to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon)
        VALUES ('jrn006-zero-area', 'Zero area', '[[44.10,15.30],[44.20,15.40],[44.30,15.50]]'::jsonb);
        RAISE EXCEPTION 'expected zero-area polygon to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon)
        VALUES ('jrn006-duplicate-edge', 'Duplicate edge', '[[44.10,15.30],[44.10,15.30],[44.30,15.50],[44.10,15.50]]'::jsonb);
        RAISE EXCEPTION 'expected duplicate consecutive point to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;
END;
$$;

ROLLBACK;
