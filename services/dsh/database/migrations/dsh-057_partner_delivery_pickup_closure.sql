-- dsh-056: audit trails for partner_delivery and pickup operational closure.
--
-- Mirrors dsh_special_requests_audit_events' shape exactly (id TEXT PK,
-- entity_id, actor_id, actor_role, action, from_state JSONB, to_state JSONB,
-- reason, correlation_id, created_at). One table per domain (partner
-- delivery tasks, pickup sessions) rather than a shared table, matching how
-- dsh_special_requests_audit_events is scoped to its own entity type.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_partner_delivery_audit_events (
    id TEXT PRIMARY KEY DEFAULT 'pdae_' || replace(gen_random_uuid()::text, '-', ''),
    entity_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    from_state JSONB,
    to_state JSONB,
    reason TEXT,
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_audit_events_entity
    ON dsh_partner_delivery_audit_events (entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dsh_pickup_audit_events (
    id TEXT PRIMARY KEY DEFAULT 'pkae_' || replace(gen_random_uuid()::text, '-', ''),
    entity_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    from_state JSONB,
    to_state JSONB,
    reason TEXT,
    correlation_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_audit_events_entity
    ON dsh_pickup_audit_events (entity_id, created_at DESC);

COMMIT;
