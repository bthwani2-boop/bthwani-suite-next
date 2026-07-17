-- dsh-055_operational_closure.sql
-- Closes the database gap for partner delivery tasks, pickup sessions, 
-- missing special request timestamps, and operational outbox.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Partner Delivery Tasks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_partner_delivery_tasks (
    id                      TEXT        PRIMARY KEY DEFAULT 'pdt_' || replace(gen_random_uuid()::text, '-', ''),
    order_id                UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    branch_id               TEXT        NOT NULL,
    store_courier_id        TEXT        NOT NULL REFERENCES dsh_store_team_members(id),
    status                  TEXT        NOT NULL DEFAULT 'assigned'
                                        CHECK (status IN ('unassigned', 'assigned', 'departed', 'arrived', 'proof_pending', 'completed', 'cancelled', 'exception')),
    assigned_at             TIMESTAMPTZ,
    picked_up_at            TIMESTAMPTZ,
    departed_at             TIMESTAMPTZ,
    arrived_at              TIMESTAMPTZ,
    proof_method            TEXT,
    proof_reference         TEXT,
    completed_at            TIMESTAMPTZ,
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_tasks_store_id ON dsh_partner_delivery_tasks(store_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_tasks_courier_id ON dsh_partner_delivery_tasks(store_courier_id);
CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_tasks_status ON dsh_partner_delivery_tasks(status);

-- ---------------------------------------------------------------------------
-- 2. Pickup Sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_pickup_sessions (
    id                      TEXT        PRIMARY KEY DEFAULT 'pses_' || replace(gen_random_uuid()::text, '-', ''),
    order_id                UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    store_id                TEXT        NOT NULL REFERENCES dsh_stores(id) ON DELETE CASCADE,
    client_id               UUID        NOT NULL,
    hashed_otp              TEXT        NOT NULL,
    expires_at              TIMESTAMPTZ NOT NULL,
    attempt_count           INTEGER     NOT NULL DEFAULT 0,
    max_attempts            INTEGER     NOT NULL DEFAULT 5,
    used_at                 TIMESTAMPTZ,
    verified_by_actor_id    TEXT,
    verification_method     TEXT,
    version                 INTEGER     NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(order_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_sessions_store_client ON dsh_pickup_sessions(store_id, client_id);

-- ---------------------------------------------------------------------------
-- 3. Special Requests Timestamps & WLT Ref
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS quote_prepared_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS customer_approved_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS purchase_batch_id TEXT;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS purchased_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS inbound_reference TEXT;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS inbound_received_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS sorting_started_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS sorting_completed_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS fulfillment_prepared_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS ready_for_delivery_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS captain_assigned_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS picked_up_at TIMESTAMPTZ;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 4. Operational Outbox Events
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_operational_outbox_events (
    id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type         TEXT        NOT NULL,
    entity_type        TEXT        NOT NULL,
    entity_id          TEXT        NOT NULL,
    payload            JSONB       NOT NULL DEFAULT '{}'::jsonb,
    status             TEXT        NOT NULL DEFAULT 'pending'
                                     CHECK (status IN ('pending', 'sent', 'failed')),
    attempt_count      INT         NOT NULL DEFAULT 0,
    last_error         TEXT,
    correlation_id     TEXT,
    next_retry_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_operational_outbox_pending
    ON dsh_operational_outbox_events(next_retry_at)
    WHERE status = 'pending';

COMMIT;
