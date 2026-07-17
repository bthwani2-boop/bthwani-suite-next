BEGIN;

-- Prevent partner_delivery and pickup orders from having bthwani captain assignments
-- Since dsh_assignments and dsh_deliveries only reference order_id, we need a trigger or a complex constraint.
-- A trigger is the standard way to cross-check order's fulfillment_mode in PostgreSQL without denormalizing.

CREATE OR REPLACE FUNCTION dsh_check_assignment_fulfillment_mode()
RETURNS TRIGGER AS $$
DECLARE
    v_mode TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT fulfillment_mode INTO v_mode FROM dsh_orders WHERE id = NEW.order_id;
        IF v_mode IN ('partner_delivery', 'pickup') THEN
            RAISE EXCEPTION 'Orders with fulfillment_mode % cannot have bthwani assignments', v_mode;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_check_assignment_mode ON dsh_assignments;
CREATE TRIGGER trg_check_assignment_mode
    BEFORE INSERT OR UPDATE ON dsh_assignments
    FOR EACH ROW
    EXECUTE FUNCTION dsh_check_assignment_fulfillment_mode();

DROP TRIGGER IF EXISTS trg_check_delivery_mode ON dsh_deliveries;
CREATE TRIGGER trg_check_delivery_mode
    BEFORE INSERT OR UPDATE ON dsh_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION dsh_check_assignment_fulfillment_mode();

COMMIT;
