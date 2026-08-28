-- DSH-1051: close the operational incident context and command identity boundary.
-- Existing incidents inherit the order's canonical operator context. New and
-- replayed commands persist their complete material envelope in command_payload.
BEGIN;

ALTER TABLE dsh_operational_incidents
    ADD COLUMN IF NOT EXISTS operator_context_id TEXT,
    ADD COLUMN IF NOT EXISTS command_payload JSONB;

UPDATE dsh_operational_incidents oi
SET operator_context_id = o.operator_context_id
FROM dsh_orders o
WHERE o.id = oi.order_id
  AND (oi.operator_context_id IS NULL OR btrim(oi.operator_context_id) = '');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM dsh_operational_incidents
        WHERE operator_context_id IS NULL OR btrim(operator_context_id) = ''
    ) THEN
        RAISE EXCEPTION 'cannot enforce operational incident operator_context_id: unresolved legacy rows';
    END IF;
END $$;

ALTER TABLE dsh_operational_incidents
    ALTER COLUMN operator_context_id SET NOT NULL;

DROP INDEX IF EXISTS uq_dsh_operational_incidents_actor_command;
CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_operational_incidents_context_actor_command
    ON dsh_operational_incidents (operator_context_id, order_id, actor_id, correlation_id)
    WHERE correlation_id IS NOT NULL AND btrim(correlation_id) <> '';

CREATE INDEX IF NOT EXISTS idx_dsh_operational_incidents_context_created
    ON dsh_operational_incidents (operator_context_id, created_at DESC);

COMMIT;
