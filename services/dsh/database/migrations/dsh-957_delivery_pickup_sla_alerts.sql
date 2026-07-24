-- dsh-957: persisted SLA breach alerts for partner_delivery and pickup.
--
-- Mirrors dsh_order_preparation_alerts' shape (JRN-032): a reconciled,
-- acknowledgeable alert row per (entity, leg) rather than a raw computed
-- state, so operators can see and acknowledge a breach even after it
-- resolves, and so an alert panel does not need to re-derive history from
-- raw timestamps.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_delivery_sla_alerts (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id                  TEXT        NOT NULL REFERENCES dsh_partner_delivery_tasks(id) ON DELETE CASCADE,
    order_id                 UUID        NOT NULL,
    store_id                 TEXT        NOT NULL,
    leg                      TEXT        NOT NULL,
    status                   TEXT        NOT NULL DEFAULT 'open'
                                          CHECK (status IN ('open', 'acknowledged', 'resolved')),
    detected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_by_actor_id TEXT,
    acknowledged_at          TIMESTAMPTZ,
    resolved_at              TIMESTAMPTZ,
    correlation_id           TEXT,
    version                  INT         NOT NULL DEFAULT 1,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_delivery_sla_alerts_open_leg
    ON dsh_delivery_sla_alerts (task_id, leg)
    WHERE status IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_dsh_delivery_sla_alerts_status
    ON dsh_delivery_sla_alerts (status, detected_at DESC);

CREATE TABLE IF NOT EXISTS dsh_pickup_sla_alerts (
    id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id               TEXT        NOT NULL REFERENCES dsh_pickup_sessions(id) ON DELETE CASCADE,
    order_id                 UUID        NOT NULL,
    store_id                 TEXT        NOT NULL,
    leg                      TEXT        NOT NULL,
    status                   TEXT        NOT NULL DEFAULT 'open'
                                          CHECK (status IN ('open', 'acknowledged', 'resolved')),
    detected_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_by_actor_id TEXT,
    acknowledged_at          TIMESTAMPTZ,
    resolved_at              TIMESTAMPTZ,
    correlation_id           TEXT,
    version                  INT         NOT NULL DEFAULT 1,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_pickup_sla_alerts_open_leg
    ON dsh_pickup_sla_alerts (session_id, leg)
    WHERE status IN ('open', 'acknowledged');
CREATE INDEX IF NOT EXISTS idx_dsh_pickup_sla_alerts_status
    ON dsh_pickup_sla_alerts (status, detected_at DESC);

COMMIT;
