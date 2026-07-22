-- dsh-906_jrn_006_client_address_geofence_binding.sql
-- Enforces JRN-006 at the database boundary: every active client address must
-- carry coordinates that resolve to the same active DSH-owned service-area
-- geofence. Deleted rows are exempt so governed anonymization can scrub them.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_point_in_polygon(
    p_longitude DOUBLE PRECISION,
    p_latitude DOUBLE PRECISION,
    p_polygon JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
    v_count INTEGER;
    v_i INTEGER;
    v_j INTEGER;
    v_xi DOUBLE PRECISION;
    v_yi DOUBLE PRECISION;
    v_xj DOUBLE PRECISION;
    v_yj DOUBLE PRECISION;
    v_cross DOUBLE PRECISION;
    v_intersects BOOLEAN;
    v_inside BOOLEAN := FALSE;
BEGIN
    IF jsonb_typeof(p_polygon) <> 'array' THEN
        RETURN FALSE;
    END IF;

    v_count := jsonb_array_length(p_polygon);
    IF v_count < 3 OR v_count > 10000 THEN
        RETURN FALSE;
    END IF;

    v_j := v_count - 1;
    FOR v_i IN 0..v_count - 1 LOOP
        IF jsonb_typeof(p_polygon -> v_i) <> 'array'
           OR jsonb_array_length(p_polygon -> v_i) <> 2
           OR jsonb_typeof(p_polygon -> v_j) <> 'array'
           OR jsonb_array_length(p_polygon -> v_j) <> 2 THEN
            RETURN FALSE;
        END IF;

        v_xi := ((p_polygon -> v_i) ->> 0)::DOUBLE PRECISION;
        v_yi := ((p_polygon -> v_i) ->> 1)::DOUBLE PRECISION;
        v_xj := ((p_polygon -> v_j) ->> 0)::DOUBLE PRECISION;
        v_yj := ((p_polygon -> v_j) ->> 1)::DOUBLE PRECISION;

        v_cross := (p_longitude - v_xi) * (v_yj - v_yi)
                 - (p_latitude - v_yi) * (v_xj - v_xi);
        IF abs(v_cross) <= 1e-9
           AND p_longitude BETWEEN LEAST(v_xi, v_xj) AND GREATEST(v_xi, v_xj)
           AND p_latitude BETWEEN LEAST(v_yi, v_yj) AND GREATEST(v_yi, v_yj) THEN
            RETURN TRUE;
        END IF;

        v_intersects := ((v_yi > p_latitude) <> (v_yj > p_latitude))
            AND p_longitude < (
                (v_xj - v_xi) * (p_latitude - v_yi)
                / NULLIF(v_yj - v_yi, 0) + v_xi
            );
        IF v_intersects THEN
            v_inside := NOT v_inside;
        END IF;
        v_j := v_i;
    END LOOP;

    RETURN v_inside;
EXCEPTION
    WHEN invalid_text_representation OR numeric_value_out_of_range THEN
        RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enforce_client_address_service_area()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_service_area_code TEXT;
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

    SELECT g.service_area_code
      INTO v_service_area_code
      FROM dsh_service_area_geofences g
     WHERE g.service_area_code = NEW.service_area_code
       AND g.active = TRUE
       AND dsh_point_in_polygon(NEW.longitude, NEW.latitude, g.polygon)
     LIMIT 1
     FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION USING
            ERRCODE = '23514',
            MESSAGE = 'DSH_ADDRESS_SERVICE_AREA_UNVERIFIED';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_client_address_service_area
    ON dsh_client_addresses;
CREATE TRIGGER trg_dsh_client_address_service_area
BEFORE INSERT OR UPDATE OF service_area_code, latitude, longitude, deleted_at
ON dsh_client_addresses
FOR EACH ROW
EXECUTE FUNCTION dsh_enforce_client_address_service_area();

COMMENT ON FUNCTION dsh_enforce_client_address_service_area() IS
    'JRN-006: rejects active client-address writes that bypass governed DSH geofences.';

COMMIT;
