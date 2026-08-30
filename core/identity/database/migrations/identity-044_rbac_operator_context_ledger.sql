-- IDENTITY-044: bind governed RBAC idempotency to the actor operator context.
-- Historical rows that cannot be mapped without guessing are quarantined with
-- an explicit non-executable marker. Runtime writers reject that marker.
BEGIN;

ALTER TABLE identity_rbac_operation_ledger
    ADD COLUMN IF NOT EXISTS operator_context_id text;

UPDATE identity_rbac_operation_ledger ledger
SET operator_context_id = btrim(actor.operator_context_id)
FROM identity_actors actor
WHERE ledger.operator_context_id IS NULL
  AND ledger.result -> 'assignment' ->> 'actorId' = actor.id
  AND btrim(actor.operator_context_id) <> '';

UPDATE identity_rbac_operation_ledger
SET operator_context_id = 'legacy-unscoped'
WHERE operator_context_id IS NULL;

ALTER TABLE identity_rbac_operation_ledger
    ALTER COLUMN operator_context_id SET NOT NULL,
    ALTER COLUMN operator_context_id DROP DEFAULT;

ALTER TABLE identity_rbac_operation_ledger
    DROP CONSTRAINT IF EXISTS identity_rbac_operation_ledger_pkey;

ALTER TABLE identity_rbac_operation_ledger
    ADD CONSTRAINT identity_rbac_operation_ledger_pkey
    PRIMARY KEY (operator_context_id, caller, operation, idempotency_key);

ALTER TABLE identity_rbac_operation_ledger
    ADD CONSTRAINT identity_rbac_operation_ledger_operator_context_nonempty
    CHECK (btrim(operator_context_id) <> '');

CREATE INDEX IF NOT EXISTS identity_rbac_operation_ledger_context_updated_idx
    ON identity_rbac_operation_ledger(operator_context_id, updated_at);

COMMENT ON COLUMN identity_rbac_operation_ledger.operator_context_id IS
    'Trusted actor ownership scope for new RBAC idempotency records; legacy-unscoped rows are migration quarantine and cannot be reused.';

COMMIT;
