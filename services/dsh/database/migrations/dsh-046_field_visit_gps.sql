-- DSH-046: GPS / geofence evidence for field visits
-- Adds start and completion location columns to dsh_field_visits so that
-- the backend can validate geofence compliance before allowing completion,
-- and operators/audit can review location evidence per visit.

ALTER TABLE dsh_field_visits
    ADD COLUMN IF NOT EXISTS start_latitude          double precision,
    ADD COLUMN IF NOT EXISTS start_longitude         double precision,
    ADD COLUMN IF NOT EXISTS start_accuracy_meters   double precision,
    ADD COLUMN IF NOT EXISTS start_captured_at       timestamptz,
    ADD COLUMN IF NOT EXISTS start_provider          text,
    ADD COLUMN IF NOT EXISTS start_device_reference  text,
    ADD COLUMN IF NOT EXISTS start_is_mocked         boolean NOT NULL DEFAULT false,

    ADD COLUMN IF NOT EXISTS completion_latitude         double precision,
    ADD COLUMN IF NOT EXISTS completion_longitude        double precision,
    ADD COLUMN IF NOT EXISTS completion_accuracy_meters  double precision,
    ADD COLUMN IF NOT EXISTS completion_captured_at      timestamptz,
    ADD COLUMN IF NOT EXISTS completion_provider         text,
    ADD COLUMN IF NOT EXISTS completion_is_mocked        boolean,

    ADD COLUMN IF NOT EXISTS store_latitude              double precision,
    ADD COLUMN IF NOT EXISTS store_longitude             double precision,
    ADD COLUMN IF NOT EXISTS geofence_radius_meters      double precision NOT NULL DEFAULT 200,
    ADD COLUMN IF NOT EXISTS start_distance_from_store_meters     double precision,
    ADD COLUMN IF NOT EXISTS completion_distance_from_store_meters double precision,
    ADD COLUMN IF NOT EXISTS start_geofence_status       text,
    ADD COLUMN IF NOT EXISTS completion_geofence_status  text;

-- Geofence status values: 'inside', 'outside', 'unknown'
ALTER TABLE dsh_field_visits
    ADD CONSTRAINT dsh_field_visits_start_geofence_status_chk
        CHECK (start_geofence_status IS NULL OR start_geofence_status IN ('inside', 'outside', 'unknown')),
    ADD CONSTRAINT dsh_field_visits_completion_geofence_status_chk
        CHECK (completion_geofence_status IS NULL OR completion_geofence_status IN ('inside', 'outside', 'unknown'));

CREATE INDEX IF NOT EXISTS idx_dsh_field_visits_start_geofence
    ON dsh_field_visits(start_geofence_status) WHERE start_geofence_status IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_field_visits_completion_geofence
    ON dsh_field_visits(completion_geofence_status) WHERE completion_geofence_status IS NOT NULL;
