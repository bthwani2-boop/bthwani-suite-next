BEGIN;

-- Keep dispatch-driven status changes and workflow stages atomically aligned.
-- Operator-driven same-status stage progress remains untouched because this
-- trigger only runs when status changes.
CREATE OR REPLACE FUNCTION dsh_sync_special_request_dispatch_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
    END IF;

    IF NEW.request_type = 'SHEIN_ASSISTED_PURCHASE' THEN
        NEW.workflow_stage := CASE
            WHEN NEW.status = 'assigned' THEN 'captain_assignment'
            WHEN NEW.status = 'in_progress' THEN 'out_for_delivery'
            WHEN NEW.status = 'completed' THEN 'delivered'
            WHEN NEW.status = 'approved' AND OLD.status IN ('assigned', 'in_progress') THEN 'ready_for_delivery'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'rejected' THEN 'rejected'
            ELSE NEW.workflow_stage
        END;
    ELSIF NEW.request_type = 'AWNAK_ERRAND' THEN
        NEW.workflow_stage := CASE
            WHEN NEW.status = 'assigned' THEN 'assigned'
            WHEN NEW.status = 'in_progress' THEN 'in_progress'
            WHEN NEW.status = 'completed' THEN 'completed'
            WHEN NEW.status = 'approved' AND OLD.status IN ('assigned', 'in_progress') THEN 'dispatch_pending'
            WHEN NEW.status = 'cancelled' THEN 'cancelled'
            WHEN NEW.status = 'rejected' THEN 'cancelled'
            ELSE NEW.workflow_stage
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

ALTER TABLE dsh_special_requests DROP CONSTRAINT IF EXISTS chk_special_request_stage;
ALTER TABLE dsh_special_requests ADD CONSTRAINT chk_special_request_stage CHECK (
    workflow_stage IS NULL OR
    (request_type = 'SHEIN_ASSISTED_PURCHASE' AND workflow_stage IN (
        'intake_review', 'quote_pending', 'customer_approval', 'batch_pending',
        'purchased', 'inbound', 'sorting', 'ready_for_delivery',
        'captain_assignment', 'out_for_delivery', 'proof_of_delivery',
        'delivered', 'exception', 'cancelled', 'rejected'
    )) OR
    (request_type = 'AWNAK_ERRAND' AND workflow_stage IN (
        'intake', 'quote_review', 'customer_approval', 'dispatch_pending',
        'assigned', 'captain_enroute_to_pickup', 'arrived_at_pickup',
        'item_received', 'in_progress', 'arrived_at_dropoff', 'proof_review',
        'completed', 'escalated', 'cancelled'
    ))
);

DROP TRIGGER IF EXISTS trg_dsh_sync_special_request_dispatch_stage ON dsh_special_requests;
CREATE TRIGGER trg_dsh_sync_special_request_dispatch_stage
    BEFORE UPDATE OF status ON dsh_special_requests
    FOR EACH ROW
    EXECUTE FUNCTION dsh_sync_special_request_dispatch_stage();

-- Repair any already-drifted rows without rewinding advanced approved stages.
UPDATE dsh_special_requests
SET workflow_stage = CASE
    WHEN request_type = 'SHEIN_ASSISTED_PURCHASE' AND status = 'assigned' THEN 'captain_assignment'
    WHEN request_type = 'SHEIN_ASSISTED_PURCHASE' AND status = 'in_progress' THEN 'out_for_delivery'
    WHEN request_type = 'SHEIN_ASSISTED_PURCHASE' AND status = 'completed' THEN 'delivered'
    WHEN request_type = 'AWNAK_ERRAND' AND status = 'assigned' THEN 'assigned'
    WHEN request_type = 'AWNAK_ERRAND' AND status = 'in_progress' THEN 'in_progress'
    WHEN request_type = 'AWNAK_ERRAND' AND status = 'completed' THEN 'completed'
    WHEN request_type = 'AWNAK_ERRAND' AND status = 'cancelled' THEN 'cancelled'
    ELSE workflow_stage
END
WHERE
    (request_type = 'SHEIN_ASSISTED_PURCHASE' AND status IN ('assigned','in_progress','completed')) OR
    (request_type = 'AWNAK_ERRAND' AND status IN ('assigned','in_progress','completed','cancelled'));

COMMIT;
