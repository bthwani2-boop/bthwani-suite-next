-- dsh-975_postgis_service_areas.sql
-- Rip out manual JSONB math and migrate to authoritative PostGIS GEOMETRY

BEGIN;

CREATE EXTENSION IF NOT EXISTS postgis;

-- 1. Add PostGIS Geometry columns
ALTER TABLE dsh_service_area_geofences ADD COLUMN polygon_geom GEOMETRY(Polygon, 4326);
ALTER TABLE dsh_service_area_versions ADD COLUMN polygon_geom GEOMETRY(Polygon, 4326);

-- 2. Migrate data from JSONB to Geometry
-- Assumes JSONB is an array of [lng, lat] arrays representing a linear ring.
UPDATE dsh_service_area_geofences
SET polygon_geom = ST_MakePolygon(ST_GeomFromGeoJSON(
    jsonb_build_object(
        'type', 'LineString',
        'coordinates', polygon
    )::text
))
WHERE polygon IS NOT NULL AND jsonb_array_length(polygon) >= 3;

UPDATE dsh_service_area_versions
SET polygon_geom = ST_MakePolygon(ST_GeomFromGeoJSON(
    jsonb_build_object(
        'type', 'LineString',
        'coordinates', polygon
    )::text
))
WHERE polygon IS NOT NULL AND jsonb_array_length(polygon) >= 3;

-- Drop constraints that relied on the old PL/pgSQL validation
ALTER TABLE dsh_service_area_geofences DROP CONSTRAINT IF EXISTS dsh_service_area_geofences_polygon_topology_check;

-- Drop the old JSONB columns and rename
ALTER TABLE dsh_service_area_geofences DROP COLUMN polygon;
ALTER TABLE dsh_service_area_geofences RENAME COLUMN polygon_geom TO polygon;

ALTER TABLE dsh_service_area_versions DROP COLUMN polygon;
ALTER TABLE dsh_service_area_versions RENAME COLUMN polygon_geom TO polygon;

-- Make it NOT NULL
ALTER TABLE dsh_service_area_geofences ALTER COLUMN polygon SET NOT NULL;
ALTER TABLE dsh_service_area_versions ALTER COLUMN polygon SET NOT NULL;

-- 3. Add spatial GIST indexes
CREATE INDEX idx_dsh_service_area_geofences_geom ON dsh_service_area_geofences USING GIST (polygon);
CREATE INDEX idx_dsh_service_area_versions_geom ON dsh_service_area_versions USING GIST (polygon);

-- 4. Add PostGIS constraint
ALTER TABLE dsh_service_area_geofences ADD CONSTRAINT check_valid_polygon CHECK (ST_IsValid(polygon));

-- 5. Drop deprecated manual PL/pgSQL math functions
DROP FUNCTION IF EXISTS dsh_validate_service_area_polygon(JSONB);
DROP FUNCTION IF EXISTS dsh_segments_intersect(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS dsh_point_on_segment(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
DROP FUNCTION IF EXISTS dsh_orientation(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);

COMMIT;
