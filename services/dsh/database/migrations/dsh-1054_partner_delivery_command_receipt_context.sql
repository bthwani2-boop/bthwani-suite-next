-- DSH-1054: make partner-delivery command receipt identity context-scoped.
-- Existing receipts are backfilled only through their still-present task/order
-- chain. Any receipt without an unambiguous canonical context aborts the
-- migration instead of inventing ownership for a replay record.

BEGIN;

ALTER TABLE dsh_partner_delivery_command_receipts
    ADD COLUMN IF NOT EXISTS operator_context_id TEXT;

UPDATE dsh_partner_delivery_command_receipts r
SET operator_context_id = o.operator_context_id
FROM dsh_partner_delivery_tasks t
JOIN dsh_orders o ON o.id = t.order_id
WHERE r.task_id = t.id
  AND (r.operator_context_id IS NULL OR BTRIM(r.operator_context_id) = '');

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM dsh_partner_delivery_command_receipts r
        LEFT JOIN dsh_partner_delivery_tasks t ON t.id = r.task_id
        LEFT JOIN dsh_orders o ON o.id = t.order_id
        WHERE NULLIF(BTRIM(r.operator_context_id), '') IS NULL
           OR NULLIF(BTRIM(o.operator_context_id), '') IS NULL
           OR BTRIM(r.operator_context_id) IS DISTINCT FROM BTRIM(o.operator_context_id)
    ) THEN
        RAISE EXCEPTION 'cannot enforce partner delivery command receipt context: existing rows are unresolved';
    END IF;
END;
$$;

ALTER TABLE dsh_partner_delivery_command_receipts
    ALTER COLUMN operator_context_id SET NOT NULL;

ALTER TABLE dsh_partner_delivery_command_receipts
    DROP CONSTRAINT IF EXISTS dsh_partner_delivery_command_receipts_operator_context_nonempty_check;
ALTER TABLE dsh_partner_delivery_command_receipts
    ADD CONSTRAINT dsh_partner_delivery_command_receipts_operator_context_nonempty_check
    CHECK (NULLIF(BTRIM(operator_context_id), '') IS NOT NULL);

ALTER TABLE dsh_partner_delivery_command_receipts
    DROP CONSTRAINT IF EXISTS dsh_partner_delivery_command_receipts_pkey;
ALTER TABLE dsh_partner_delivery_command_receipts
    ADD CONSTRAINT dsh_partner_delivery_command_receipts_pkey
    PRIMARY KEY (operator_context_id, actor_id, command_id);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_command_receipts_context_task
    ON dsh_partner_delivery_command_receipts(operator_context_id, task_id);

COMMIT;
