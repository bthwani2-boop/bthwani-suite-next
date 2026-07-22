-- DSH-094: Durable lifecycle timestamps, no-show recovery, idempotency and
-- optimistic-concurrency receipts for JRN-015 pickup mutations.
--
-- The pickup surfaces already send commandId and expectedVersion. This migration
-- makes those values authoritative at the DSH boundary and persists the customer
-- notification, arrival, no-show and rescheduling facts in the pickup truth row.

BEGIN;

ALTER TABLE dsh_pickup_sessions
    ADD COLUMN IF NOT EXISTS customer_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS customer_arrived_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS no_show_reason TEXT,
    ADD COLUMN IF NOT EXISTS rescheduled_at TIMESTAMPTZ;

UPDATE dsh_pickup_sessions
SET no_show_at = COALESCE(no_show_at, used_at, updated_at),
    no_show_reason = COALESCE(NULLIF(BTRIM(no_show_reason), ''), 'legacy_no_show')
WHERE status = 'no_show';

CREATE OR REPLACE FUNCTION dsh_prepare_pickup_no_show_shape()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'no_show' THEN
        NEW.no_show_at := COALESCE(NEW.no_show_at, NEW.used_at, NOW());
        NEW.no_show_reason := COALESCE(NULLIF(BTRIM(NEW.no_show_reason), ''), 'recorded_by_partner');
    ELSIF OLD.status = 'no_show' AND NEW.status <> 'no_show' THEN
        NEW.no_show_at := NULL;
        NEW.no_show_reason := NULL;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_prepare_pickup_no_show_shape ON dsh_pickup_sessions;
CREATE TRIGGER trg_dsh_prepare_pickup_no_show_shape
BEFORE INSERT OR UPDATE OF status, used_at, no_show_at, no_show_reason
ON dsh_pickup_sessions
FOR EACH ROW
EXECUTE FUNCTION dsh_prepare_pickup_no_show_shape();

ALTER TABLE dsh_pickup_sessions
    DROP CONSTRAINT IF EXISTS dsh_pickup_sessions_no_show_shape_check;
ALTER TABLE dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_no_show_shape_check CHECK (
        (status = 'no_show'
         AND no_show_at IS NOT NULL
         AND NULLIF(BTRIM(no_show_reason), '') IS NOT NULL)
        OR
        (status <> 'no_show' AND no_show_at IS NULL AND no_show_reason IS NULL)
    );

CREATE OR REPLACE FUNCTION dsh_project_pickup_lifecycle_audit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.action = 'notify_customer' THEN
        UPDATE dsh_pickup_sessions
           SET customer_notified_at = NEW.created_at,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE order_id::text = NEW.entity_id;
    ELSIF NEW.action = 'customer_arrived' THEN
        UPDATE dsh_pickup_sessions
           SET customer_arrived_at = NEW.created_at,
               version = version + 1,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE order_id::text = NEW.entity_id
           AND status = 'active';
    ELSIF NEW.action = 'no_show' THEN
        UPDATE dsh_pickup_sessions
           SET no_show_at = NEW.created_at,
               no_show_reason = COALESCE(NULLIF(BTRIM(NEW.reason), ''), no_show_reason),
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE id = NEW.entity_id;
    ELSIF NEW.action = 'reschedule' THEN
        UPDATE dsh_pickup_sessions
           SET rescheduled_at = NEW.created_at,
               customer_notified_at = NULL,
               customer_arrived_at = NULL,
               no_show_at = NULL,
               no_show_reason = NULL,
               updated_at = GREATEST(updated_at, NEW.created_at)
         WHERE id = NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_project_pickup_lifecycle_audit ON dsh_pickup_audit_events;
CREATE TRIGGER trg_dsh_project_pickup_lifecycle_audit
AFTER INSERT ON dsh_pickup_audit_events
FOR EACH ROW
EXECUTE FUNCTION dsh_project_pickup_lifecycle_audit();

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_sessions_active_expiry
    ON dsh_pickup_sessions(expires_at, updated_at DESC)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS dsh_pickup_mutation_commands (
    command_id          TEXT        PRIMARY KEY,
    order_id            UUID        NOT NULL REFERENCES dsh_orders(id) ON DELETE CASCADE,
    action              TEXT        NOT NULL
                                    CHECK (action IN (
                                        'mark_ready',
                                        'notify_customer',
                                        'customer_arrived',
                                        'verify_otp',
                                        'no_show',
                                        'extend_window',
                                        'reschedule'
                                    )),
    expected_version    INTEGER     NOT NULL CHECK (expected_version >= 0),
    response_status     INTEGER,
    response_body       JSONB,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT dsh_pickup_mutation_commands_completion_shape_check CHECK (
        (completed_at IS NULL AND response_status IS NULL AND response_body IS NULL)
        OR
        (completed_at IS NOT NULL
         AND response_status BETWEEN 200 AND 299
         AND response_body IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_mutation_commands_order_action
    ON dsh_pickup_mutation_commands(order_id, action, created_at DESC);

COMMIT;
