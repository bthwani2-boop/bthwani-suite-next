-- DSH-039: Captain foreground location push (register item 14 + 42).
--
-- Owner decision: NO live tracking, NO background location. The captain app
-- sends a periodic foreground location update (every 3 minutes) only while
-- an active dispatch assignment exists. Only the latest point is retained —
-- no history table — and it is purged the moment the assignment reaches a
-- terminal state (declined or completed), per the privacy decision. These
-- columns therefore live on the existing dsh_assignments table instead of a
-- new table.

ALTER TABLE dsh_assignments
    ADD COLUMN IF NOT EXISTS last_latitude        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS last_longitude        DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_recorded_at  TIMESTAMPTZ;

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS dsh_assignments_last_latitude_check;
ALTER TABLE dsh_assignments ADD CONSTRAINT dsh_assignments_last_latitude_check
    CHECK (last_latitude IS NULL OR (last_latitude >= -90 AND last_latitude <= 90));

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS dsh_assignments_last_longitude_check;
ALTER TABLE dsh_assignments ADD CONSTRAINT dsh_assignments_last_longitude_check
    CHECK (last_longitude IS NULL OR (last_longitude >= -180 AND last_longitude <= 180));
