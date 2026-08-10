-- DSH-142: Order Rescue Saga and Action Execution Log.
-- Ensures strict single-active execution constraint for rescue cases.

CREATE TABLE IF NOT EXISTS dsh_order_rescue_actions (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    rescue_case_id          UUID        NOT NULL REFERENCES dsh_order_rescue_cases(id) ON DELETE CASCADE,
    action_type             TEXT        NOT NULL CHECK (action_type IN (
                                        'replace_item',
                                        'remove_item',
                                        'wait_customer',
                                        'change_delivery_mode',
                                        'reassign_captain',
                                        'convert_to_support_exception',
                                        'create_follow_up_task',
                                        'open_wlt_visibility'
                                    )),
    status                  TEXT        NOT NULL DEFAULT 'pending_approval' CHECK (status IN (
                                        'pending_approval',
                                        'approved',
                                        'executing',
                                        'completed',
                                        'failed',
                                        'rejected'
                                    )),
    payload                 JSONB       NOT NULL DEFAULT '{}',
    requested_by            TEXT        NOT NULL,
    approved_by             TEXT,
    executed_by             TEXT,
    execution_result        JSONB,
    correlation_id          TEXT        NOT NULL,
    idempotency_key         TEXT        NOT NULL,
    version                 BIGINT      NOT NULL DEFAULT 1,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(requested_by, idempotency_key)
);

-- Ensure only ONE action is active per case at a time (single-active constraint)
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_order_rescue_active_action
    ON dsh_order_rescue_actions(rescue_case_id)
    WHERE status IN ('pending_approval', 'approved', 'executing');
