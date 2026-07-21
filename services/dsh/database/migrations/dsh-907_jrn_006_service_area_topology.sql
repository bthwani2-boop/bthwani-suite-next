-- dsh-907_jrn_006_service_area_topology.sql
-- Fail closed on malformed, zero-area, duplicate-edge, and self-intersecting geofences.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_orientation(
    a_x DOUBLE PRECISION, a_y DOUBLE PRECISION,
    b_x DOUBLE PRECISION, b_y DOUBLE PRECISION,
    c_x DOUBLE PRECISION, c_y DOUBLE PRECISION
) RETURNS DOUBLE PRECISION
LANGUAGE sql IMMUTABLE STRICT
AS $$
    SELECT (b_x - a_x) * (c_y - a_y) - (b_y - a_y) * (c_x - a_x)
$$;

CREATE OR REPLACE FUNCTION dsh_point_on_segment(
    p_x DOUBLE PRECISION, p_y DOUBLE PRECISION,
    a_x DOUBLE PRECISION, a_y DOUBLE PRECISION,
    b_x DOUBLE PRECISION, b_y DOUBLE PRECISION
) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE STRICT
AS $$
    SELECT abs(dsh_orientation(a_x, a_y, b_x, b_y, p_x, p_y)) <= 1e-10
       AND p_x BETWEEN least(a_x, b_x) - 1e-10 AND greatest(a_x, b_x) + 1e-10
       AND p_y BETWEEN least(a_y, b_y) - 1e-10 AND greatest(a_y, b_y) + 1e-10
$$;

CREATE OR REPLACE FUNCTION dsh_segments_intersect(
    a_x DOUBLE PRECISION, a_y DOUBLE PRECISION,
    b_x DOUBLE PRECISION, b_y DOUBLE PRECISION,
    c_x DOUBLE PRECISION, c_y DOUBLE PRECISION,
    d_x DOUBLE PRECISION, d_y DOUBLE PRECISION
) RETURNS BOOLEAN
LANGUAGE plpgsql IMMUTABLE STRICT
AS $$
DECLARE
    o1 DOUBLE PRECISION := dsh_orientation(a_x, a_y, b_x, b_y, c_x, c_y);
    o2 DOUBLE PRECISION := dsh_orientation(a_x, a_y, b_x, b_y, d_x, d_y);
    o3 DOUBLE PRECISION := dsh_orientation(c_x, c_y, d_x, d_y, a_x, a_y);
    o4 DOUBLE PRECISION := dsh_orientation(c_x, c_y, d_x, d_y, b_x, b_y);
BEGIN
    IF ((o1 > 1e-10 AND o2 < -1e-10) OR (o1 < -1e-10 AND o2 > 1e-10))
       AND ((o3 > 1e-10 AND o4 < -1e-10) OR (o3 < -1e-10 AND o4 > 1e-10)) THEN
        RETURN TRUE;
    END IF;
    RETURN dsh_point_on_segment(c_x, c_y, a_x, a_y, b_x, b_y)
        OR dsh_point_on_segment(d_x, d_y, a_x, a_y, b_x, b_y)
        OR dsh_point_on_segment(a_x, a_y, c_x, c_y, d_x, d_y)
        OR dsh_point_on_segment(b_x, b_y, c_x, c_y, d_x, d_y);
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
    a_x DOUBLE PRECISION;
    a_y DOUBLE PRECISION;
    b_x DOUBLE PRECISION;
    b_y DOUBLE PRECISION;
    c_x DOUBLE PRECISION;
    c_y DOUBLE PRECISION;
    d_x DOUBLE PRECISION;
    d_y DOUBLE PRECISION;
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
            a_x := (candidate -> i ->> 0)::DOUBLE PRECISION;
            a_y := (candidate -> i ->> 1)::DOUBLE PRECISION;
            b_x := (candidate -> i_next ->> 0)::DOUBLE PRECISION;
            b_y := (candidate -> i_next ->> 1)::DOUBLE PRECISION;
        EXCEPTION WHEN OTHERS THEN
            RETURN FALSE;
        END;
        IF a_x < -180 OR a_x > 180 OR b_x < -180 OR b_x > 180
           OR a_y < -90 OR a_y > 90 OR b_y < -90 OR b_y > 90 THEN
            RETURN FALSE;
        END IF;
        IF abs(a_x - b_x) <= 1e-10 AND abs(a_y - b_y) <= 1e-10 THEN
            RETURN FALSE;
        END IF;
        twice_area := twice_area + a_x * b_y - b_x * a_y;
    END LOOP;

    IF abs(twice_area) <= 1e-10 THEN
        RETURN FALSE;
    END IF;

    FOR i IN 0..point_count - 1 LOOP
        i_next := (i + 1) % point_count;
        a_x := (candidate -> i ->> 0)::DOUBLE PRECISION;
        a_y := (candidate -> i ->> 1)::DOUBLE PRECISION;
        b_x := (candidate -> i_next ->> 0)::DOUBLE PRECISION;
        b_y := (candidate -> i_next ->> 1)::DOUBLE PRECISION;
        FOR j IN i + 1..point_count - 1 LOOP
            j_next := (j + 1) % point_count;
            IF i_next = j OR j_next = i OR (i = 0 AND j_next = 0) THEN
                CONTINUE;
            END IF;
            c_x := (candidate -> j ->> 0)::DOUBLE PRECISION;
            c_y := (candidate -> j ->> 1)::DOUBLE PRECISION;
            d_x := (candidate -> j_next ->> 0)::DOUBLE PRECISION;
            d_y := (candidate -> j_next ->> 1)::DOUBLE PRECISION;
            IF dsh_segments_intersect(a_x, a_y, b_x, b_y, c_x, c_y, d_x, d_y) THEN
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
