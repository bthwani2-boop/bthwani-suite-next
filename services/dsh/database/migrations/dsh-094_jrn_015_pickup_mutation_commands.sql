-- DSH-094: Durable idempotency and optimistic-concurrency receipts for JRN-015 pickup mutations.
--
-- The pickup surfaces already send commandId and expectedVersion. This table makes
-- those values authoritative at the DSH boundary so retries cannot repeat a
-- successful mutation and concurrent surfaces cannot silently overwrite state.

BEGIN;

CREATE TABLE IF NOT EXISTS dsh_pickup_mutation_commands (
    command_id          TEXT        PRIMARY KEY,
    order_id            UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    action              TEXT        NOT NULL
                                    CHECK (action IN (
                                        'mark_ready',
                                        'notify_customer',
                                        'customer_arrived',
                                        'verify_otp',
                                        'no_show',
                                        'extend_window',
                                        'reschedule'
                                    )),
    expected_version    INTEGER     NOT NULL CHECK (expected_version >= 0),
    response_status     INTEGER,
    response_body       JSONB,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_pickup_mutation_commands_completion_shape_check CHECK (
        (completed_at IS NULL AND response_status IS NULL AND response_body IS NULL)
        OR
        (completed_at IS NOT NULL
         AND response_status BETWEEN 200 AND 299
         AND response_body IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_mutation_commands_order_action
    ON dsh_pickup_mutation_commands(order_id, action, created_at DESC);

COMMIT;
