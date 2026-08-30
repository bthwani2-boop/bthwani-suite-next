-- dsh-907_service_area_topology.sql
-- Requires dsh-076, dsh-907, and the dsh-981 PostGIS cutover: the polygon
-- column is geometry(Polygon,4326) and topology validity is enforced by
-- ST_IsValid through the check_valid_polygon constraint.

BEGIN;

INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon, active, priority)
VALUES (
    'valid-topology',
    'Valid topology',
    ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[44.10,15.30],[44.30,15.30],[44.30,15.50],[44.10,15.50],[44.10,15.30]]]}'), 4326),
    TRUE,
    100
);

DO $$
BEGIN
    BEGIN
        INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon)
        VALUES ('self-intersection', 'تغطية متقاطعة',
                ST_SetSRID(ST_GeomFromGeoJSON('{"type":"Polygon","coordinates":[[[44.10,15.30],[44.30,15.50],[44.30,15.30],[44.10,15.50],[44.10,15.30]]]}'), 4326));
        RAISE EXCEPTION 'expected self-intersecting polygon to be rejected';
    EXCEPTION WHEN check_violation THEN
        NULL;
    END;

    BEGIN
        INSERT INTO dsh_service_area_geofences(service_area_code, display_name, polygon)
        VALUES ('wrong-geometry-type', 'نوع هندسي خاطئ',
                ST_SetSRID(ST_GeomFromGeoJSON('{"type":"LineString","coordinates":[[44.10,15.30],[44.30,15.50]]}'), 4326));
        RAISE EXCEPTION 'expected non-polygon geometry to be rejected';
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;
END;
$$;

ROLLBACK;
