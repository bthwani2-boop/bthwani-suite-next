-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-008: Field Verification & Store Quality Assurance
-- Field agents record visits, complete readiness checklists, and escalate issues.
-- Partners see their onboarding status. Operators govern the readiness pipeline.
-- DSH owns verification lifecycle state only. Finance/payout remains in WLT.

CREATE TABLE IF NOT EXISTS dsh_field_visits (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id      TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    field_agent_id TEXT        NOT NULL,
    visit_type    TEXT        NOT NULL DEFAULT 'onboarding'
                                CHECK (visit_type IN ('onboarding', 'periodic', 'escalation_followup')),
    status        TEXT        NOT NULL DEFAULT 'in_progress'
                                CHECK (status IN ('in_progress', 'complete', 'escalated')),
    notes         TEXT,
    started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_readiness_checks (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id      UUID        NOT NULL REFERENCES dsh_field_visits(id) ON DELETE CASCADE,
    store_id      TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    check_type    TEXT        NOT NULL
                                CHECK (check_type IN (
                                    'location_verified',
                                    'documents_uploaded',
                                    'product_list_submitted',
                                    'equipment_checked',
                                    'safety_compliant',
                                    'hygiene_compliant'
                                )),
    status        TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'passed', 'failed')),
    evidence_url  TEXT,
    notes         TEXT,
    verified_by   TEXT        NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_readiness_escalations (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id        UUID        REFERENCES dsh_field_visits(id) ON DELETE SET NULL,
    store_id        TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    raised_by       TEXT        NOT NULL,
    severity        TEXT        NOT NULL DEFAULT 'medium'
                                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category        TEXT        NOT NULL
                                    CHECK (category IN (
                                        'document_missing',
                                        'safety_violation',
                                        'location_mismatch',
                                        'product_compliance',
                                        'equipment_failure',
                                        'other'
                                    )),
    description     TEXT        NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'open'
                                    CHECK (status IN ('open', 'acknowledged', 'resolved', 'escalated_further')),
    resolved_by     TEXT,
    resolved_at     TIMESTAMPTZ,
    resolution_note TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_field_visits_store_id     ON dsh_field_visits(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_field_visits_agent_id     ON dsh_field_visits(field_agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_readiness_checks_visit_check ON dsh_readiness_checks(visit_id, check_type);
CREATE INDEX IF NOT EXISTS idx_dsh_readiness_checks_visit_id ON dsh_readiness_checks(visit_id);
CREATE INDEX IF NOT EXISTS idx_dsh_readiness_checks_store_id ON dsh_readiness_checks(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_escalations_store_id      ON dsh_readiness_escalations(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_escalations_status        ON dsh_readiness_escalations(status);
