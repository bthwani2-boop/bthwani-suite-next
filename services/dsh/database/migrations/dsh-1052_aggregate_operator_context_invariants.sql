-- DSH-1052: Enforce Database Invariants for OperatorContext Aggregate Integrity
-- 1. dsh_order_cancellations.operator_context_id must match dsh_orders.operator_context_id
-- 2. dsh_operational_incidents.operator_context_id must match dsh_orders.operator_context_id
-- 3. dsh_partner_delivery_tasks store and order must belong to the identical operator_context_id

BEGIN;

-- 1. Trigger function for dsh_order_cancellations operator_context_id invariant
CREATE OR REPLACE FUNCTION trg_fn_dsh_order_cancellations_operator_context()
RETURNS trigger AS $$
DECLARE
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_order_context IS NULL THEN
        RAISE EXCEPTION 'dsh_order_cancellations: order % not found', NEW.order_id;
    END IF;

    IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
        NEW.operator_context_id := v_order_context;
    ELSIF NEW.operator_context_id <> v_order_context THEN
        RAISE EXCEPTION 'dsh_order_cancellations.operator_context_id (%) does not match order operator_context_id (%)',
            NEW.operator_context_id, v_order_context;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_order_cancellations_operator_context_match ON dsh_order_cancellations;
CREATE TRIGGER trg_dsh_order_cancellations_operator_context_match
BEFORE INSERT OR UPDATE OF operator_context_id, order_id ON dsh_order_cancellations
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_order_cancellations_operator_context();

-- 2. Trigger function for dsh_operational_incidents operator_context_id invariant
CREATE OR REPLACE FUNCTION trg_fn_dsh_operational_incidents_operator_context()
RETURNS trigger AS $$
DECLARE
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_order_context IS NULL THEN
        RAISE EXCEPTION 'dsh_operational_incidents: order % not found', NEW.order_id;
    END IF;

    IF NEW.operator_context_id IS NULL OR btrim(NEW.operator_context_id) = '' THEN
        NEW.operator_context_id := v_order_context;
    ELSIF NEW.operator_context_id <> v_order_context THEN
        RAISE EXCEPTION 'dsh_operational_incidents.operator_context_id (%) does not match order operator_context_id (%)',
            NEW.operator_context_id, v_order_context;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_operational_incidents_operator_context_match ON dsh_operational_incidents;
CREATE TRIGGER trg_dsh_operational_incidents_operator_context_match
BEFORE INSERT OR UPDATE OF operator_context_id, order_id ON dsh_operational_incidents
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_operational_incidents_operator_context();

-- 3. Trigger function for dsh_partner_delivery_tasks store / order operator_context_id alignment
CREATE OR REPLACE FUNCTION trg_fn_dsh_partner_delivery_tasks_context_integrity()
RETURNS trigger AS $$
DECLARE
    v_store_context TEXT;
    v_order_context TEXT;
BEGIN
    SELECT operator_context_id INTO v_store_context
    FROM dsh_stores
    WHERE id = NEW.store_id;

    SELECT operator_context_id INTO v_order_context
    FROM dsh_orders
    WHERE id = NEW.order_id;

    IF v_store_context IS NOT NULL AND v_order_context IS NOT NULL AND v_store_context <> v_order_context THEN
        RAISE EXCEPTION 'dsh_partner_delivery_tasks: store operator_context_id (%) does not match order operator_context_id (%)',
            v_store_context, v_order_context;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_partner_delivery_tasks_context_integrity ON dsh_partner_delivery_tasks;
CREATE TRIGGER trg_dsh_partner_delivery_tasks_context_integrity
BEFORE INSERT OR UPDATE OF store_id, order_id ON dsh_partner_delivery_tasks
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_partner_delivery_tasks_context_integrity();

COMMIT;
