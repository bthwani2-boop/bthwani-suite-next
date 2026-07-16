-- LEGACY_FILENAME_ONLY — not a slice reference
-- DSH-009: Support, Incidents & Escalation Room
-- Clients, partners, and captains submit tickets. Operators manage the support hub.
-- DSH owns ticket lifecycle state only. Financial disputes route to WLT by reference.

CREATE TABLE IF NOT EXISTS dsh_support_tickets (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id        TEXT        REFERENCES dsh_stores(id) ON DELETE SET NULL,
    reporter_id     TEXT        NOT NULL,
    reporter_role   TEXT        NOT NULL
                                    CHECK (reporter_role IN ('client', 'partner', 'captain', 'operator')),
    subject         TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    category        TEXT        NOT NULL
                                    CHECK (category IN (
                                        'order_issue',
                                        'delivery_issue',
                                        'store_quality',
                                        'payment_reference',
                                        'account_access',
                                        'app_bug',
                                        'other'
                                    )),
    priority        TEXT        NOT NULL DEFAULT 'normal'
                                    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status          TEXT        NOT NULL DEFAULT 'open'
                                    CHECK (status IN ('open', 'in_review', 'pending_user', 'resolved', 'closed')),
    assigned_to     TEXT,
    order_id        UUID,
    resolved_at     TIMESTAMPTZ,
    closed_at       TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_support_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id   UUID        NOT NULL REFERENCES dsh_support_tickets(id) ON DELETE CASCADE,
    sender_id   TEXT        NOT NULL,
    sender_role TEXT        NOT NULL
                                CHECK (sender_role IN ('client', 'partner', 'captain', 'operator', 'system')),
    body        TEXT        NOT NULL,
    is_internal BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dsh_incidents (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT        NOT NULL,
    description     TEXT        NOT NULL,
    severity        TEXT        NOT NULL DEFAULT 'medium'
                                    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status          TEXT        NOT NULL DEFAULT 'open'
                                    CHECK (status IN ('open', 'monitoring', 'resolved')),
    affected_scope  TEXT        NOT NULL DEFAULT 'unknown'
                                    CHECK (affected_scope IN ('delivery', 'stores', 'payments', 'platform', 'unknown')),
    raised_by       TEXT        NOT NULL,
    resolved_by     TEXT,
    resolved_at     TIMESTAMPTZ,
    postmortem_url  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_support_tickets_reporter    ON dsh_support_tickets(reporter_id);
CREATE INDEX IF NOT EXISTS idx_dsh_support_tickets_status      ON dsh_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_dsh_support_tickets_store_id    ON dsh_support_tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_support_messages_ticket_id  ON dsh_support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_dsh_incidents_status            ON dsh_incidents(status);
CREATE INDEX IF NOT EXISTS idx_dsh_incidents_severity          ON dsh_incidents(severity);
