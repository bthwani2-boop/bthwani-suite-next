BEGIN;

-- The dispatch owner already supports assignments and deliveries sourced from
-- either an order or a special request. Its exception overlay must preserve the
-- same source fork instead of rejecting JRN-022 assignments.
ALTER TABLE dsh_delivery_exceptions
    ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE dsh_delivery_exceptions
    ADD COLUMN IF NOT EXISTS special_request_id UUID
        REFERENCES dsh_special_requests(id) ON DELETE CASCADE;

ALTER TABLE dsh_delivery_exceptions
    DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_source_check;
ALTER TABLE dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_source_check CHECK (
        (order_id IS NOT NULL) <> (special_request_id IS NOT NULL)
    );

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_special_request
    ON dsh_delivery_exceptions (special_request_id, reported_at DESC)
    WHERE special_request_id IS NOT NULL;

COMMIT;
