-- DSH-143: Introduce Order Cancellation Saga and drop dependent work trigger.

BEGIN;

-- 1. Drop the legacy trigger that violated physical custody blocks.
DROP TRIGGER IF EXISTS trg_dsh_cancel_order_dependent_work ON dsh_orders;
DROP FUNCTION IF EXISTS dsh_cancel_order_dependent_work();

-- 2. Upgrade dsh_order_cancellations to act as a stateful case record.
ALTER TABLE dsh_order_cancellations
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'requested',
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Set existing records to a terminal state ('cancelled' since they are historic)
UPDATE dsh_order_cancellations
SET status = 'cancelled'
WHERE status = 'requested';

ALTER TABLE dsh_order_cancellations DROP CONSTRAINT IF EXISTS dsh_order_cancellations_status_check;
ALTER TABLE dsh_order_cancellations ADD CONSTRAINT dsh_order_cancellations_status_check
    CHECK (status IN (
        'requested',
        'review',
        'approved',
        'rejected',
        'cancelling',
        'cancelled',
        'conflict',
        'unknown'
    ));

-- 3. Create actions table for the cancellation saga orchestration
CREATE TABLE IF NOT EXISTS dsh_order_cancellation_actions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cancellation_id    UUID NOT NULL REFERENCES dsh_order_cancellations(id) ON DELETE CASCADE,
    action_type        TEXT NOT NULL,
    status             TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'executing', 'completed', 'failed', 'rejected')),
    payload            JSONB,
    idempotency_key    TEXT NOT NULL,
    correlation_id     TEXT NOT NULL,
    created_by         TEXT NOT NULL,
    executed_by        TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cancellation_id, idempotency_key)
);

-- Partial index ensuring a single-active-action per cancellation case
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_order_cancellation_actions_active
    ON dsh_order_cancellation_actions(cancellation_id)
    WHERE status IN ('pending_approval', 'executing');

COMMIT;
