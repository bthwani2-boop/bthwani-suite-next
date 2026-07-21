-- DSH-091: Separate pickup cancellation from successful OTP consumption.
-- used_at represents a consumed pickup decision (verified/no-show), while
-- cancellation has its own explicit status, timestamp and reason.

BEGIN;

ALTER TABLE dsh_pickup_sessions
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

UPDATE dsh_pickup_sessions
SET status = CASE
        WHEN verification_method = 'cancelled' THEN 'cancelled'
        WHEN verification_method = 'otp' THEN 'verified'
        WHEN verification_method = 'no_show' THEN 'no_show'
        WHEN used_at IS NOT NULL THEN 'consumed'
        ELSE 'active'
    END,
    cancelled_at = CASE
        WHEN verification_method = 'cancelled' THEN COALESCE(cancelled_at, used_at, updated_at)
        ELSE cancelled_at
    END,
    cancellation_reason = CASE
        WHEN verification_method = 'cancelled' THEN COALESCE(NULLIF(cancellation_reason, ''), 'order_cancelled')
        ELSE cancellation_reason
    END,
    used_at = CASE
        WHEN verification_method = 'cancelled' THEN NULL
        ELSE used_at
    END,
    verified_by_actor_id = CASE
        WHEN verification_method = 'cancelled' THEN NULL
        ELSE verified_by_actor_id
    END,
    verification_method = CASE
        WHEN verification_method = 'cancelled' THEN NULL
        ELSE verification_method
    END;

ALTER TABLE dsh_pickup_sessions
    DROP CONSTRAINT IF EXISTS dsh_pickup_sessions_status_check;
ALTER TABLE dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_status_check
    CHECK (status IN ('active','verified','no_show','consumed','cancelled'));

ALTER TABLE dsh_pickup_sessions
    DROP CONSTRAINT IF EXISTS dsh_pickup_sessions_cancellation_shape_check;
ALTER TABLE dsh_pickup_sessions
    ADD CONSTRAINT dsh_pickup_sessions_cancellation_shape_check
    CHECK (
      (status = 'cancelled'
       AND cancelled_at IS NOT NULL
       AND NULLIF(BTRIM(cancellation_reason), '') IS NOT NULL
       AND used_at IS NULL
       AND verification_method IS NULL)
      OR
      (status <> 'cancelled' AND cancelled_at IS NULL)
    );

CREATE INDEX IF NOT EXISTS idx_dsh_pickup_sessions_status
    ON dsh_pickup_sessions(status, updated_at DESC);

CREATE OR REPLACE FUNCTION dsh_cancel_order_dependent_work()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_reason TEXT;
BEGIN
    IF NEW.status NOT IN (
        'cancelled_by_client',
        'cancelled_by_store',
        'cancelled_by_operator',
        'cancelled_no_driver',
        'failed_payment',
        'failed_dispatch'
    ) OR OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    v_reason := COALESCE(
        NULLIF(BTRIM(NEW.cancellation_note), ''),
        NULLIF(BTRIM(NEW.cancellation_reason_code), ''),
        NEW.status
    );

    UPDATE dsh_assignments
       SET status='cancelled',
           last_latitude=NULL,
           last_longitude=NULL,
           location_recorded_at=NULL,
           updated_at=NOW()
     WHERE order_id=NEW.id
       AND status IN ('offered','accepted');

    UPDATE dsh_deliveries
       SET status='cancelled',
           note=COALESCE(NULLIF(note,''), v_reason),
           updated_at=NOW()
     WHERE order_id=NEW.id
       AND status <> 'delivered';

    UPDATE dsh_partner_delivery_tasks
       SET status='cancelled', version=version+1, updated_at=NOW()
     WHERE order_id=NEW.id
       AND status NOT IN ('completed','cancelled');

    UPDATE dsh_pickup_sessions
       SET status='cancelled',
           cancelled_at=COALESCE(cancelled_at,NOW()),
           cancellation_reason=COALESCE(NULLIF(cancellation_reason,''),v_reason),
           used_at=NULL,
           verified_by_actor_id=NULL,
           verification_method=NULL,
           version=version+1,
           updated_at=NOW()
     WHERE order_id=NEW.id
       AND status <> 'cancelled';

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_cancel_order_dependent_work ON dsh_orders;
CREATE TRIGGER trg_dsh_cancel_order_dependent_work
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_cancel_order_dependent_work();

COMMIT;
