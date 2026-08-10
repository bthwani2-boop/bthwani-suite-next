-- DSH-099: Expand governed incident lifecycle and tasks for J075

-- 1. Drop existing CHECK constraints on status
ALTER TABLE dsh_incidents DROP CONSTRAINT IF EXISTS dsh_incidents_status_check;
ALTER TABLE dsh_incident_events DROP CONSTRAINT IF EXISTS dsh_incident_events_to_status_check;
ALTER TABLE dsh_incident_events DROP CONSTRAINT IF EXISTS dsh_incident_events_event_type_check;

-- 2. Add expanded constraints
-- J075 Lifecycle: open, triaged, containing, mitigating, monitoring, resolved, closed
ALTER TABLE dsh_incidents
    ADD CONSTRAINT dsh_incidents_status_check
    CHECK (status IN ('open', 'triaged', 'containing', 'mitigating', 'monitoring', 'resolved', 'closed'));

ALTER TABLE dsh_incident_events
    ADD CONSTRAINT dsh_incident_events_to_status_check
    CHECK (to_status IN ('open', 'triaged', 'containing', 'mitigating', 'monitoring', 'resolved', 'closed'));

ALTER TABLE dsh_incident_events
    ADD CONSTRAINT dsh_incident_events_event_type_check
    CHECK (event_type IN (
        'created',
        'status_changed',
        'triaged',
        'containing_started',
        'mitigating_started',
        'monitoring_started',
        'resolved',
        'closed',
        'reopened'
    ));

-- 3. Incident Tasks (Field/Operator Assignments)
CREATE TABLE IF NOT EXISTS dsh_incident_tasks (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID        NOT NULL REFERENCES dsh_incidents(id) ON DELETE CASCADE,
    assignee_id     TEXT        NOT NULL,
    assignee_role   TEXT        NOT NULL CHECK (assignee_role IN ('operator', 'field', 'captain', 'partner')),
    description     TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'canceled')),
    evidence_url    TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsh_incident_tasks_incident ON dsh_incident_tasks(incident_id);

-- 4. Incident Communications (Internal Notes vs Public Safe Updates)
CREATE TABLE IF NOT EXISTS dsh_incident_communications (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id     UUID        NOT NULL REFERENCES dsh_incidents(id) ON DELETE CASCADE,
    author_id       TEXT        NOT NULL,
    body            TEXT        NOT NULL,
    is_public_safe  BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dsh_incident_comms_incident ON dsh_incident_communications(incident_id);

-- 5. Incident Entities (Deduplication and Domain Refs)
CREATE TABLE IF NOT EXISTS dsh_incident_entities (
    incident_id     UUID        NOT NULL REFERENCES dsh_incidents(id) ON DELETE CASCADE,
    entity_type     TEXT        NOT NULL CHECK (entity_type IN ('store', 'provider', 'order', 'payout', 'identity', 'runtime', 'person', 'driver')),
    entity_id       TEXT        NOT NULL,
    PRIMARY KEY (incident_id, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_dsh_incident_entities_entity ON dsh_incident_entities(entity_type, entity_id);
