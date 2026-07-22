-- dsh-116_partner_delivery_command_idempotency_and_exception_evidence.sql
-- JRN-016: durable command replay protection and governed delivery-exception evidence.

BEGIN;

ALTER TABLE dsh_partner_delivery_tasks
    ADD COLUMN IF NOT EXISTS exception_reason TEXT,
    ADD COLUMN IF NOT EXISTS exception_evidence_references JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS exception_reported_at TIMESTAMPTZ;

ALTER TABLE dsh_partner_delivery_tasks
    DROP CONSTRAINT IF EXISTS chk_dsh_partner_delivery_exception_reason;

-- Enforce the invariant for all new or changed rows without inventing a reason
-- for legacy exception rows that predate JRN-016 evidence persistence.
ALTER TABLE dsh_partner_delivery_tasks
    ADD CONSTRAINT chk_dsh_partner_delivery_exception_reason
    CHECK (
        status <> 'exception'
        OR (exception_reason IS NOT NULL AND btrim(exception_reason) <> '')
    ) NOT VALID;

ALTER TABLE dsh_partner_delivery_tasks
    DROP CONSTRAINT IF EXISTS chk_dsh_partner_delivery_exception_evidence_array;

ALTER TABLE dsh_partner_delivery_tasks
    ADD CONSTRAINT chk_dsh_partner_delivery_exception_evidence_array
    CHECK (jsonb_typeof(exception_evidence_references) = 'array');

CREATE TABLE IF NOT EXISTS dsh_partner_delivery_command_receipts (
    actor_id            TEXT        NOT NULL,
    command_id          TEXT        NOT NULL,
    action              TEXT        NOT NULL,
    request_fingerprint TEXT        NOT NULL,
    task_id             TEXT        REFERENCES dsh_partner_delivery_tasks(id) ON DELETE SET NULL,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
    PRIMARY KEY (actor_id, command_id),
    CHECK (btrim(actor_id) <> ''),
    CHECK (btrim(command_id) <> ''),
    CHECK (btrim(action) <> ''),
    CHECK (btrim(request_fingerprint) <> '')
);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_command_receipts_task
    ON dsh_partner_delivery_command_receipts(task_id);

CREATE INDEX IF NOT EXISTS idx_dsh_partner_delivery_command_receipts_expiry
    ON dsh_partner_delivery_command_receipts(expires_at);

COMMIT;
