-- DSH-1056: make persisted partner-delivery SLA alerts context-owned.
-- Alerts derive ownership from their canonical task/order aggregate; any
-- ambiguous legacy row aborts the migration instead of inventing a context.

BEGIN;

ALTER TABLE dsh_delivery_sla_alerts
    ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_delivery_sla_alerts a
SET operator_context_id = o.operator_context_id
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id = t.order_id
WHERE a.task_id = t.id
  AND (a.operator_context_id IS NULL OR BTRIM(a.operator_context_id) = '');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dsh_delivery_sla_alerts a
        LEFT JOIN dsh_partner_delivery_tasks t ON t.id = a.task_id
        LEFT JOIN dsh_orders o ON o.id = t.order_id
        WHERE NULLIF(BTRIM(a.operator_context_id), '') IS NULL
           OR NULLIF(BTRIM(o.operator_context_id), '') IS NULL
           OR BTRIM(a.operator_context_id) IS DISTINCT FROM BTRIM(o.operator_context_id)
           OR a.order_id IS DISTINCT FROM t.order_id
    ) THEN
        RAISE EXCEPTION 'cannot enforce delivery SLA alert operator context: existing rows are unresolved';
    END IF;
END;
$$;

ALTER TABLE dsh_delivery_sla_alerts
    ALTER COLUMN operator_context_id SET NOT NULL;
ALTER TABLE dsh_delivery_sla_alerts
    DROP CONSTRAINT IF EXISTS dsh_delivery_sla_alerts_operator_context_nonempty_check;
ALTER TABLE dsh_delivery_sla_alerts
    ADD CONSTRAINT dsh_delivery_sla_alerts_operator_context_nonempty_check
    CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL);

CREATE OR REPLACE FUNCTION trg_fn_dsh_delivery_sla_alerts_operator_context()
RETURNS trigger AS $$
DECLARE
    v_order_id UUID;
    v_source_context TEXT;
BEGIN
    SELECT o.id, NULLIF(BTRIM(o.operator_context_id), '')
    INTO v_order_id, v_source_context
    FROM dsh_partner_delivery_tasks t
    JOIN dsh_orders o ON o.id = t.order_id
    WHERE t.id = NEW.task_id;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'delivery SLA alert source context is missing';
    END IF;
    IF NEW.order_id IS NULL OR NEW.order_id IS DISTINCT FROM v_order_id THEN
        RAISE EXCEPTION 'delivery SLA alert order does not match its task';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'delivery SLA alert operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_delivery_sla_alerts_operator_context ON dsh_delivery_sla_alerts;
CREATE TRIGGER trg_dsh_delivery_sla_alerts_operator_context
BEFORE INSERT OR UPDATE OF operator_context_id, task_id, order_id
ON dsh_delivery_sla_alerts
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_delivery_sla_alerts_operator_context();

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_sla_alerts_operator_context_status
    ON dsh_delivery_sla_alerts(operator_context_id, status, detected_at DESC);

COMMIT;
