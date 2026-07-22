-- Prevent stale, future-dated, or out-of-order location writes from bypassing
-- the governed HTTP path. Only the latest foreground sample is retained.

CREATE OR REPLACE FUNCTION dsh_validate_dispatch_location_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.location_recorded_at IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.last_latitude IS NULL OR NEW.last_longitude IS NULL THEN
        RAISE EXCEPTION 'location timestamp requires coordinates'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.location_recorded_at < NOW() - INTERVAL '10 minutes' THEN
        RAISE EXCEPTION 'location sample is stale'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.location_recorded_at > NOW() + INTERVAL '30 seconds' THEN
        RAISE EXCEPTION 'location sample is ahead of server time'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.location_recorded_at IS NOT NULL
       AND NEW.location_recorded_at <= OLD.location_recorded_at THEN
        RAISE EXCEPTION 'location sample is out of order'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_assignments_validate_location_timestamp ON dsh_assignments;
CREATE TRIGGER trg_dsh_assignments_validate_location_timestamp
BEFORE UPDATE OF last_latitude, last_longitude, location_recorded_at ON dsh_assignments
FOR EACH ROW
WHEN (NEW.location_recorded_at IS NOT NULL)
EXECUTE FUNCTION dsh_validate_dispatch_location_timestamp();
