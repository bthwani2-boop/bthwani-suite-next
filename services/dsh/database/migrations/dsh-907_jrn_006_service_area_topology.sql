-- dsh-907_jrn_006_service_area_topology.sql
-- Fail closed on malformed, zero-area, duplicate-edge, and self-intersecting geofences.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_orientation(
    ax DOUBLE PRECISION, ay DOUBLE PRECISION,
    bx DOUBLE PRECISION, by DOUBLE PRECISION,
    cx DOUBLE PRECISION, cy DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE STRICT
AS $$
    SELECT (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
$$;

CREATE OR REPLACE FUNCTION dsh_point_on_segment(
    px DOUBLE PRECISION, py DOUBLE PRECISION,
    ax DOUBLE PRECISION, ay DOUBLE PRECISION,
    bx DOUBLE PRECISION, by DOUBLE PRECISION
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT
AS $$
    SELECT abs(dsh_orientation(ax, ay, bx, by, px, py)) <= 1e-10
       AND px BETWEEN least(ax, bx) - 1e-10 AND greatest(ax, bx) + 1e-10
       AND py BETWEEN least(ay, by) - 1e-10 AND greatest(ay, by) + 1e-10
$$;

CREATE OR REPLACE FUNCTION dsh_segments_intersect(
    ax DOUBLE PRECISION, ay DOUBLE PRECISION,
    bx DOUBLE PRECISION, by DOUBLE PRECISION,
    cx DOUBLE PRECISION, cy DOUBLE PRECISION,
    dx DOUBLE PRECISION, dy DOUBLE PRECISION
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
    o1 DOUBLE PRECISION := dsh_orientation(ax, ay, bx, by, cx, cy);
    o2 DOUBLE PRECISION := dsh_orientation(ax, ay, bx, by, dx, dy);
    o3 DOUBLE PRECISION := dsh_orientation(cx, cy, dx, dy, ax, ay);
    o4 DOUBLE PRECISION := dsh_orientation(cx, cy, dx, dy, bx, by);
BEGIN
    IF ((o1 > 1e-10 AND o2 < -1e-10) OR (o1 < -1e-10 AND o2 > 1e-10))
       AND ((o3 > 1e-10 AND o4 < -1e-10) OR (o3 < -1e-10 AND o4 > 1e-10)) THEN
        RETURN TRUE;
    END IF;
    RETURN dsh_point_on_segment(cx, cy, ax, ay, bx, by)
        OR dsh_point_on_segment(dx, dy, ax, ay, bx, by)
        OR dsh_point_on_segment(ax, ay, cx, cy, dx, dy)
        OR dsh_point_on_segment(bx, by, cx, cy, dx, dy);
END;
$$;

CREATE OR REPLACE FUNCTION dsh_validate_service_area_polygon(candidate JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
    point_count INTEGER;
    i INTEGER;
    j INTEGER;
    i_next INTEGER;
    j_next INTEGER;
    ax DOUBLE PRECISION;
    ay DOUBLE PRECISION;
    bx DOUBLE PRECISION;
    by DOUBLE PRECISION;
    cx DOUBLE PRECISION;
    cy DOUBLE PRECISION;
    dx DOUBLE PRECISION;
    dy DOUBLE PRECISION;
    twice_area DOUBLE PRECISION := 0;
BEGIN
    IF candidate IS NULL OR jsonb_typeof(candidate) <> 'array' THEN
        RETURN FALSE;
    END IF;
    point_count := jsonb_array_length(candidate);
    IF point_count < 3 OR point_count > 10000 THEN
        RETURN FALSE;
    END IF;

    FOR i IN 0..point_count - 1 LOOP
        i_next := (i + 1) % point_count;
        IF jsonb_typeof(candidate -> i) <> 'array'
           OR jsonb_array_length(candidate -> i) <> 2
           OR jsonb_typeof(candidate -> i_next) <> 'array'
           OR jsonb_array_length(candidate -> i_next) <> 2 THEN
            RETURN FALSE;
        END IF;
        BEGIN
            ax := (candidate -> i ->> 0)::DOUBLE PRECISION;
            ay := (candidate -> i ->> 1)::DOUBLE PRECISION;
            bx := (candidate -> i_next ->> 0)::DOUBLE PRECISION;
            by := (candidate -> i_next ->> 1)::DOUBLE PRECISION;
        EXCEPTION WHEN OTHERS THEN
            RETURN FALSE;
        END;
        IF ax < -180 OR ax > 180 OR bx < -180 OR bx > 180
           OR ay < -90 OR ay > 90 OR by < -90 OR by > 90 THEN
            RETURN FALSE;
        END IF;
        IF abs(ax - bx) <= 1e-10 AND abs(ay - by) <= 1e-10 THEN
            RETURN FALSE;
        END IF;
        twice_area := twice_area + ax * by - bx * ay;
    END LOOP;

    IF abs(twice_area) <= 1e-10 THEN
        RETURN FALSE;
    END IF;

    FOR i IN 0..point_count - 1 LOOP
        i_next := (i + 1) % point_count;
        ax := (candidate -> i ->> 0)::DOUBLE PRECISION;
        ay := (candidate -> i ->> 1)::DOUBLE PRECISION;
        bx := (candidate -> i_next ->> 0)::DOUBLE PRECISION;
        by := (candidate -> i_next ->> 1)::DOUBLE PRECISION;
        FOR j IN i + 1..point_count - 1 LOOP
            j_next := (j + 1) % point_count;
            IF i_next = j OR j_next = i OR (i = 0 AND j_next = 0) THEN
                CONTINUE;
            END IF;
            cx := (candidate -> j ->> 0)::DOUBLE PRECISION;
            cy := (candidate -> j ->> 1)::DOUBLE PRECISION;
            dx := (candidate -> j_next ->> 0)::DOUBLE PRECISION;
            dy := (candidate -> j_next ->> 1)::DOUBLE PRECISION;
            IF dsh_segments_intersect(ax, ay, bx, by, cx, cy, dx, dy) THEN
                RETURN FALSE;
            END IF;
        END LOOP;
    END LOOP;
    RETURN TRUE;
END;
$$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM dsh_service_area_geofences
        WHERE NOT dsh_validate_service_area_polygon(polygon)
    ) THEN
        RAISE EXCEPTION 'DSH_SERVICE_AREA_INVALID_TOPOLOGY existing rows must be repaired before migration';
    END IF;
END;
$$;

ALTER TABLE dsh_service_area_geofences
    DROP CONSTRAINT IF EXISTS dsh_service_area_geofences_polygon_topology_check;
ALTER TABLE dsh_service_area_geofences
    ADD CONSTRAINT dsh_service_area_geofences_polygon_topology_check
    CHECK (dsh_validate_service_area_polygon(polygon));

COMMIT;
