-- dsh-054_special_requests_closure.sql
-- Closes out the dsh-053 special-requests slice: adds a workflow_stage
-- state machine, WLT payment-session linkage, forks dsh_assignments /
-- dsh_deliveries to accept a special-request source (in addition to
-- order_id), adds an audit trail mirroring dsh_marketing_audit_events, and
-- runs a diagnostic (non-destructive) check for leftover legacy
-- 'node-shay-in' catalog rows.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. dsh_special_requests: workflow_stage, estimated amount, WLT session id
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS workflow_stage TEXT;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS estimated_amount_minor_units BIGINT;
ALTER TABLE dsh_special_requests ADD COLUMN IF NOT EXISTS wlt_payment_session_id VARCHAR(255);

-- estimated_amount_reference (VARCHAR, dsh-053) is left untouched; it is
-- deprecated in favor of estimated_amount_minor_units but is not dropped
-- here so existing readers keep working across the cutover.

ALTER TABLE dsh_special_requests DROP CONSTRAINT IF EXISTS chk_special_request_stage;
ALTER TABLE dsh_special_requests ADD CONSTRAINT chk_special_request_stage CHECK (
    workflow_stage IS NULL OR
    (request_type = 'SHEIN_ASSISTED_PURCHASE' AND workflow_stage IN (
        'intake_review', 'quote_pending', 'customer_approval', 'batch_pending',
        'purchased', 'inbound', 'sorting', 'ready_for_delivery',
        'captain_assignment', 'delivered', 'exception'
    )) OR
    (request_type = 'AWNAK_ERRAND' AND workflow_stage IN (
        'intake', 'quote_review', 'dispatch_pending', 'assigned', 'in_progress',
        'proof_review', 'completed', 'cancelled', 'escalated'
    ))
);

ALTER TABLE dsh_special_requests DROP CONSTRAINT IF EXISTS chk_special_request_estimated_amount;
ALTER TABLE dsh_special_requests ADD CONSTRAINT chk_special_request_estimated_amount CHECK (
    estimated_amount_minor_units IS NULL OR estimated_amount_minor_units >= 0
);

-- Backfill workflow_stage for pre-existing rows from their current status.
-- Guarded by "workflow_stage IS NULL" so a re-run never clobbers a stage
-- that has since moved on under normal operation.
UPDATE dsh_special_requests
SET workflow_stage = CASE status
    WHEN 'submitted'             THEN NULL
    WHEN 'under_review'          THEN 'intake_review'
    WHEN 'needs_customer_input'  THEN 'customer_approval'
    WHEN 'approved'              THEN 'batch_pending'
    WHEN 'assigned'              THEN 'captain_assignment'
    WHEN 'in_progress'           THEN 'ready_for_delivery'
    WHEN 'completed'             THEN 'delivered'
    WHEN 'cancelled'             THEN NULL
    WHEN 'rejected'              THEN NULL
END
WHERE request_type = 'SHEIN_ASSISTED_PURCHASE' AND workflow_stage IS NULL;

UPDATE dsh_special_requests
SET workflow_stage = CASE status
    WHEN 'submitted'             THEN NULL
    WHEN 'under_review'          THEN 'intake'
    WHEN 'needs_customer_input'  THEN 'quote_review'
    WHEN 'approved'              THEN 'dispatch_pending'
    WHEN 'assigned'              THEN 'assigned'
    WHEN 'in_progress'           THEN 'in_progress'
    WHEN 'completed'             THEN 'completed'
    WHEN 'cancelled'             THEN 'cancelled'
    WHEN 'rejected'              THEN NULL
END
WHERE request_type = 'AWNAK_ERRAND' AND workflow_stage IS NULL;

-- dsh-053 already indexes (client_id, idempotency_key), (client_id),
-- (status), and (request_type) individually; operators filter by the
-- combination of type + status (and increasingly workflow_stage), so add
-- the composite that isn't already covered.
CREATE INDEX IF NOT EXISTS idx_dsh_special_requests_operator_filters
    ON dsh_special_requests (request_type, status, workflow_stage);

-- ---------------------------------------------------------------------------
-- 2. Dispatch source fork: dsh_assignments / dsh_deliveries can now be
--    sourced from a special request instead of an order.
-- ---------------------------------------------------------------------------
ALTER TABLE dsh_assignments ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE dsh_deliveries ALTER COLUMN order_id DROP NOT NULL;

ALTER TABLE dsh_assignments ADD COLUMN IF NOT EXISTS special_request_id UUID
    REFERENCES dsh_special_requests(id) ON DELETE CASCADE;
ALTER TABLE dsh_deliveries ADD COLUMN IF NOT EXISTS special_request_id UUID
    REFERENCES dsh_special_requests(id) ON DELETE CASCADE;

ALTER TABLE dsh_assignments DROP CONSTRAINT IF EXISTS chk_assignment_source;
ALTER TABLE dsh_assignments ADD CONSTRAINT chk_assignment_source CHECK (
    (order_id IS NOT NULL) <> (special_request_id IS NOT NULL)
);

ALTER TABLE dsh_deliveries DROP CONSTRAINT IF EXISTS chk_delivery_source;
ALTER TABLE dsh_deliveries ADD CONSTRAINT chk_delivery_source CHECK (
    (order_id IS NOT NULL) <> (special_request_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_dsh_assignments_special_request
    ON dsh_assignments(special_request_id)
    WHERE special_request_id IS NOT NULL;

-- Mirrors idx_dsh_assignments_active_order (dsh-007): only one active
-- assignment ('offered' or 'accepted') per source at a time.
CREATE UNIQUE INDEX IF NOT EXISTS idx_dsh_assignments_active_special_request
    ON dsh_assignments(special_request_id)
    WHERE special_request_id IS NOT NULL AND status IN ('offered', 'accepted');

-- Mirrors idx_dsh_deliveries_order (dsh-007), which is a plain non-unique
-- lookup index with no active-status partial uniqueness; dsh_deliveries has
-- no such uniqueness constraint for order_id either, so none is added here.
CREATE INDEX IF NOT EXISTS idx_dsh_deliveries_special_request
    ON dsh_deliveries(special_request_id)
    WHERE special_request_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Audit trail, mirroring dsh_marketing_audit_events (dsh-017) column set
--    and index style, scoped to dsh_special_requests only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dsh_special_requests_audit_events (
    id             TEXT        PRIMARY KEY,
    entity_id      UUID        NOT NULL,
    actor_id       TEXT        NOT NULL,
    actor_role     TEXT        NOT NULL,
    action         TEXT        NOT NULL,
    from_state     JSONB       NOT NULL DEFAULT '{}'::jsonb,
    to_state       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    reason         TEXT        NOT NULL DEFAULT '',
    correlation_id TEXT        NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsh_special_requests_audit_events_entity
    ON dsh_special_requests_audit_events (entity_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Legacy 'shay_in' verification (diagnostic only, no destructive action).
--    dsh-053:71-74 already migrated the one known 'node-shay-in' row to
--    'node-shein'. This block only reports if anything still looks like a
--    leftover legacy row; it never deletes or updates data.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    legacy_count INT;
    canonical_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO legacy_count
    FROM dsh_catalog_nodes
    WHERE id ILIKE '%shay%' OR slug ILIKE '%shay%';

    SELECT EXISTS (
        SELECT 1 FROM dsh_catalog_nodes WHERE id = 'node-shein'
    ) INTO canonical_exists;

    IF legacy_count > 0 AND canonical_exists THEN
        RAISE NOTICE 'dsh-054: % legacy shay-in catalog node row(s) found alongside canonical node-shein; review for manual cleanup (left untouched).', legacy_count;
    ELSIF legacy_count > 0 THEN
        RAISE NOTICE 'dsh-054: % legacy shay-in catalog node row(s) found and no canonical node-shein exists; left untouched.', legacy_count;
    END IF;
END $$;

COMMIT;
