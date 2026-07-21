-- DSH-129: durable preparation SLA and customer-decision escalation alerts.
-- Alerts are operational only; no wallet, refund, ledger, or settlement truth is stored.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_order_preparation_alerts (
    id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id              UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id              TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    alert_kind            TEXT        NOT NULL CHECK (alert_kind IN (
                                             'due_soon',
                                             'overdue',
                                             'customer_decision_pending'
                                         )),
    status                TEXT        NOT NULL DEFAULT 'open'
                                     CHECK (status IN ('open', 'acknowledged', 'resolved')),
    estimate_revision     INTEGER     NOT NULL DEFAULT 0 CHECK (estimate_revision >= 0),
    detected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_by_actor_id TEXT,
    acknowledged_at       TIMESTAMPTZ,
    resolved_at           TIMESTAMPTZ,
    resolution_reason     TEXT,
    version               INTEGER     NOT NULL DEFAULT 1 CHECK (version > 0),
    correlation_id        TEXT        NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (order_id, alert_kind, estimate_revision, correlation_id),
    CHECK (
        (status = 'open'
            AND acknowledged_by_actor_id IS NULL
            AND acknowledged_at IS NULL
            AND resolved_at IS NULL)
        OR
        (status = 'acknowledged'
            AND acknowledged_by_actor_id IS NOT NULL
            AND acknowledged_at IS NOT NULL
            AND resolved_at IS NULL)
        OR
        (status = 'resolved'
            AND resolved_at IS NOT NULL
            AND length(btrim(COALESCE(resolution_reason, ''))) BETWEEN 3 AND 500)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_order_preparation_active_alert
    ON dsh_order_preparation_alerts (order_id, alert_kind, estimate_revision)
    WHERE status IN ('open', 'acknowledged');

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_alerts_status
    ON dsh_order_preparation_alerts (status, alert_kind, detected_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_order_preparation_alerts_store
    ON dsh_order_preparation_alerts (store_id, status, detected_at DESC);

COMMIT;
