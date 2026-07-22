BEGIN;

-- JRN-022: operators may request missing information without overloading
-- rejection_reason or client-authored notes. One pending exchange per request
-- keeps the workflow deterministic while preserving every completed round.
CREATE TABLE IF NOT EXISTS dsh_special_request_information_exchanges (
    id                          UUID PRIMARY KEY,
    tenant_id                   TEXT NOT NULL,
    special_request_id          UUID NOT NULL REFERENCES dsh_special_requests(id) ON DELETE CASCADE,
    client_id                   TEXT NOT NULL,
    requested_by_operator_id    TEXT NOT NULL,
    question                    TEXT NOT NULL CHECK (char_length(trim(question)) BETWEEN 5 AND 2000),
    response                    TEXT,
    status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'responded')),
    request_version_at_request  INTEGER NOT NULL CHECK (request_version_at_request > 0),
    request_version_at_response INTEGER CHECK (request_version_at_response > 0),
    requested_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at                TIMESTAMPTZ,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (
        (status = 'pending' AND response IS NULL AND responded_at IS NULL AND request_version_at_response IS NULL)
        OR
        (status = 'responded' AND response IS NOT NULL AND responded_at IS NOT NULL AND request_version_at_response IS NOT NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_special_request_information_pending
    ON dsh_special_request_information_exchanges (tenant_id, special_request_id)
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_information_history
    ON dsh_special_request_information_exchanges (tenant_id, special_request_id, requested_at DESC);

-- Distinguish a missing-information request from quote approval. Both require
-- customer input, but only customer_approval may create a WLT payment session.
ALTER TABLE dsh_special_requests DROP CONSTRAINT IF EXISTS chk_special_request_stage;
ALTER TABLE dsh_special_requests ADD CONSTRAINT chk_special_request_stage CHECK (
    workflow_stage IS NULL OR
    (request_type = 'SHEIN_ASSISTED_PURCHASE' AND workflow_stage IN (
        'intake_review', 'quote_pending', 'customer_information', 'customer_approval',
        'batch_pending', 'purchased', 'inbound', 'sorting', 'ready_for_delivery',
        'captain_assignment', 'out_for_delivery', 'proof_of_delivery', 'delivered',
        'exception', 'cancelled', 'rejected'
    )) OR
    (request_type = 'AWNAK_ERRAND' AND workflow_stage IN (
        'intake', 'quote_review', 'customer_information', 'customer_approval',
        'dispatch_pending', 'assigned', 'captain_enroute_to_pickup',
        'arrived_at_pickup', 'item_received', 'in_progress', 'arrived_at_dropoff',
        'proof_review', 'completed', 'escalated', 'cancelled'
    ))
);

COMMIT;
