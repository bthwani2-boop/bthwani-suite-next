-- dsh-956: operational_incident model for sovereign platform interventions.
--
-- Cancel/suspend/raise-exception actions taken by the operator against a
-- partner-owned execution surface (partner_delivery, pickup, or the order
-- itself) are recorded here *before* their consequence is applied, so the
-- "why" of an override always has a durable, queryable record distinct from
-- the target entity's own audit trail. before_state/after_state/applied_at
-- are written once and never revised afterward.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_operational_incidents (
    id                  TEXT        PRIMARY KEY DEFAULT 'oi_' || replace(gen_random_uuid()::text, '-', ''),
    order_id            UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    target_entity_type  TEXT        NOT NULL
                                     CHECK (target_entity_type IN ('partner_delivery_task', 'pickup_session', 'order')),
    target_entity_id    TEXT        NOT NULL,
    incident_type       TEXT        NOT NULL
                                     CHECK (incident_type IN ('raise_exception', 'cancel', 'suspend')),
    status              TEXT        NOT NULL DEFAULT 'open'
                                     CHECK (status IN ('open', 'applied', 'failed')),
    reason              TEXT        NOT NULL,
    ticket_reference    TEXT        NOT NULL,
    actor_id            TEXT        NOT NULL,
    actor_role          TEXT        NOT NULL,
    before_state        JSONB,
    after_state         JSONB,
    failure_reason      TEXT,
    partner_notified    BOOLEAN     NOT NULL DEFAULT FALSE,
    partner_notified_at TIMESTAMPTZ,
    correlation_id      TEXT,
    applied_at          TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_operational_incidents_entity
    ON dsh_operational_incidents (target_entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_operational_incidents_order
    ON dsh_operational_incidents (order_id, created_at DESC);

COMMIT;
