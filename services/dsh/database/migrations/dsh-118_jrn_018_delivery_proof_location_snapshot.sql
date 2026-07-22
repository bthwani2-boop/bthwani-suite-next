-- JRN-018: attach the most recent governed captain location to delivery proof
-- when the device cannot send coordinates in the proof request itself.
-- The snapshot is operational DSH evidence only and is not exposed to clients.

CREATE OR REPLACE FUNCTION dsh_snapshot_delivery_proof_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    assignment_latitude DOUBLE PRECISION;
    assignment_longitude DOUBLE PRECISION;
    assignment_recorded_at TIMESTAMPTZ;
BEGIN
    IF NEW.captured_latitude IS NOT NULL OR NEW.captured_longitude IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT last_latitude, last_longitude, location_recorded_at
      INTO assignment_latitude, assignment_longitude, assignment_recorded_at
      FROM dsh_assignments
     WHERE id = NEW.assignment_id;

    IF assignment_latitude IS NOT NULL
       AND assignment_longitude IS NOT NULL
       AND assignment_recorded_at IS NOT NULL
       AND assignment_recorded_at >= NEW.submitted_at - INTERVAL '15 minutes'
    THEN
        NEW.captured_latitude := assignment_latitude;
        NEW.captured_longitude := assignment_longitude;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_delivery_proofs_location_snapshot ON dsh_delivery_proofs;
CREATE TRIGGER trg_dsh_delivery_proofs_location_snapshot
BEFORE INSERT ON dsh_delivery_proofs
FOR EACH ROW
EXECUTE FUNCTION dsh_snapshot_delivery_proof_location();
