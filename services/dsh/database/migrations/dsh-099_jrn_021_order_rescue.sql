-- DSH-099: JRN-021 sovereign order rescue cases and append-only audit.
-- Rescue decisions are operational only. WLT remains read-only and is referenced
-- through the explicit wlt_reference_only owner / open_wlt_visibility action.

CREATE TABLE IF NOT EXISTS dsh_order_rescue_cases (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE RESTRICT,
    ticket_id               UUID        REFERENCES dsh_support_tickets(id) ON DELETE SET NULL,
    status                  TEXT        NOT NULL DEFAULT 'open'
                                        CHECK (status IN ('open','investigating','action_required','resolved','closed')),
    reason                  TEXT        NOT NULL CHECK (reason IN (
                                        'item_unavailable',
                                        'customer_not_reachable',
                                        'store_closed_after_order',
                                        'captain_no_show',
                                        'captain_declined',
                                        'pickup_failed',
                                        'handoff_mismatch',
                                        'delivery_failed',
                                        'address_issue',
                                        'payment_failure',
                                        'wlt_visibility'
                                    )),
    severity                TEXT        NOT NULL DEFAULT 'warning'
                                        CHECK (severity IN ('warning','danger')),
    owner                   TEXT        NOT NULL DEFAULT 'operations'
                                        CHECK (owner IN ('support','operations','partner','captain','wlt_reference_only')),
    next_action             TEXT        NOT NULL DEFAULT 'create_follow_up_task'
                                        CHECK (next_action IN (
                                        'replace_item',
                                        'remove_item',
                                        'wait_customer',
                                        'change_delivery_mode',
                                        'reassign_captain',
                                        'convert_to_support_exception',
                                        'create_follow_up_task',
                                        'open_wlt_visibility'
                                    )),
    summary                 TEXT        NOT NULL,
    operator_note           TEXT        NOT NULL DEFAULT '',
    affected_entity         TEXT        NOT NULL DEFAULT '',
    assigned_to             TEXT,
    opened_by               TEXT        NOT NULL,
    resolution_note         TEXT        NOT NULL DEFAULT '',
    create_idempotency_key  TEXT        NOT NULL,
    correlation_id          TEXT        NOT NULL,
    version                 BIGINT      NOT NULL DEFAULT 1,
    resolved_at             TIMESTAMPTZ,
    closed_at               TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (opened_by, create_idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_order_rescue_active_order
    ON dsh_order_rescue_cases(order_id)
    WHERE status NOT IN ('resolved','closed');

CREATE INDEX IF NOT EXISTS idx_dsh_order_rescue_queue
    ON dsh_order_rescue_cases(status, severity, updated_at DESC, id);

CREATE TABLE IF NOT EXISTS dsh_order_rescue_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rescue_case_id  UUID        NOT NULL REFERENCES dsh_order_rescue_cases(id) ON DELETE CASCADE,
    order_id        UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE RESTRICT,
    actor_id        TEXT        NOT NULL,
    event_type      TEXT        NOT NULL CHECK (event_type IN (
                                    'created',
                                    'decision_recorded',
                                    'status_changed',
                                    'resolved',
                                    'closed'
                                )),
    from_status     TEXT,
    to_status       TEXT        NOT NULL,
    correlation_id  TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (rescue_case_id, event_type, correlation_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_order_rescue_events_case
    ON dsh_order_rescue_events(rescue_case_id, created_at, id);
