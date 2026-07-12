-- DSH-034: Field visit data integrity
-- Prevents concurrent in-progress field visits (per store and per agent), and
-- links store field verifications to the readiness visit they are derived from.

-- One active (in_progress) readiness visit per store at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_field_visits_store_in_progress
    ON dsh_field_visits(store_id)
    WHERE status = 'in_progress';

-- One active (in_progress) readiness visit per field agent at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_field_visits_agent_in_progress
    ON dsh_field_visits(field_agent_id)
    WHERE status = 'in_progress';

-- Link a field verification decision to the readiness visit it was derived from.
-- Nullable for now: application layer requires it going forward, but existing
-- rows and any in-flight deploys are not broken by this migration.
ALTER TABLE dsh_store_field_verifications
    ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES dsh_field_visits(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_store_field_verifications_visit_id
    ON dsh_store_field_verifications(visit_id);
