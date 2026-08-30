-- DSH-1053: close legacy incident command payloads and delivery-exception context boundaries.
-- Existing incident rows are reconstructed only from fields that were canonical
-- before DSH-1053. The application compares the resulting envelope exactly and
-- rejects any retry that supplies material fields not present in that history.

BEGIN;

UPDATE dsh_operational_incidents
SET command_payload = jsonb_build_object(
    'orderId', order_id::text,
    'operatorContextId', operator_context_id,
    'targetEntityType', target_entity_type,
    'targetEntityId', target_entity_id,
    'incidentType', incident_type,
    'reason', reason,
    'ticketReference', ticket_reference,
    'actorId', actor_id,
    'actorRole', actor_role,
    'correlationId', COALESCE(correlation_id, ''),
    'expectedVersion', 0,
    'evidenceReferences', '[]'::jsonb,
    'commandId', '',
    'reasonCode', '',
    'reasonNote', ''
)
WHERE command_payload IS NULL;

ALTER TABLE dsh_operational_incidents
    ALTER COLUMN command_payload SET NOT NULL;

ALTER TABLE dsh_operational_incidents
    DROP CONSTRAINT IF EXISTS dsh_operational_incidents_command_payload_object_check;
ALTER TABLE dsh_operational_incidents
    ADD CONSTRAINT dsh_operational_incidents_command_payload_object_check
    CHECK (jsonb_typeof(command_payload) = 'object');

-- Delivery exceptions are operator-context-owned even when reached through a
-- captain or partner surface. The source row and assignment must agree with
-- the stored exception context before any new row or ownership key changes.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dsh_delivery_exceptions e
        LEFT JOIN dsh_orders o ON o.id = e.order_id
        LEFT JOIN dsh_special_requests sr ON sr.id = e.special_request_id
        WHERE NULLIF(BTRIM(e.operator_context_id), '') IS NULL
           OR NULLIF(BTRIM(COALESCE(o.operator_context_id, sr.operator_context_id)), '') IS NULL
           OR BTRIM(e.operator_context_id) IS DISTINCT FROM
              COALESCE(NULLIF(BTRIM(o.operator_context_id), ''), NULLIF(BTRIM(sr.operator_context_id), ''))
    ) THEN
        RAISE EXCEPTION 'cannot enforce delivery exception operator context: existing rows are inconsistent';
    END IF;
END;
$$;

ALTER TABLE dsh_delivery_exceptions
    DROP CONSTRAINT IF EXISTS dsh_delivery_exceptions_operator_context_nonempty_check;
ALTER TABLE dsh_delivery_exceptions
    ADD CONSTRAINT dsh_delivery_exceptions_operator_context_nonempty_check
    CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL);

CREATE OR REPLACE FUNCTION trg_fn_dsh_delivery_exceptions_operator_context()
RETURNS trigger AS $$
DECLARE
    v_source_context TEXT;
BEGIN
    IF NEW.order_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '') INTO v_source_context
        FROM dsh_orders
        WHERE id = NEW.order_id;
    ELSIF NEW.special_request_id IS NOT NULL THEN
        SELECT NULLIF(BTRIM(operator_context_id), '') INTO v_source_context
        FROM dsh_special_requests
        WHERE id = NEW.special_request_id;
    END IF;

    IF v_source_context IS NULL THEN
        RAISE EXCEPTION 'delivery exception source context is missing';
    END IF;
    IF NULLIF(BTRIM(NEW.operator_context_id), '') IS NULL THEN
        NEW.operator_context_id := v_source_context;
    ELSIF BTRIM(NEW.operator_context_id) <> v_source_context THEN
        RAISE EXCEPTION 'delivery exception operator context does not match its source';
    ELSE
        NEW.operator_context_id := BTRIM(NEW.operator_context_id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_dsh_delivery_exceptions_operator_context ON dsh_delivery_exceptions;
CREATE TRIGGER trg_dsh_delivery_exceptions_operator_context
BEFORE INSERT OR UPDATE OF operator_context_id, order_id, special_request_id, assignment_id
ON dsh_delivery_exceptions
FOR EACH ROW
EXECUTE FUNCTION trg_fn_dsh_delivery_exceptions_operator_context();

CREATE INDEX IF NOT EXISTS idx_dsh_delivery_exceptions_operator_context_queue
    ON dsh_delivery_exceptions(operator_context_id, status, severity, reported_at DESC);

COMMIT;
