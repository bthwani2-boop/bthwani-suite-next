-- WLT-955: reconciliation is a control projection, never a payment authority.
-- Payment authorize/capture cases may resolve only after the linked session has
-- reached a canonical terminal provider state. This protects the invariant even
-- if a future writer bypasses the Go service boundary.
BEGIN;

CREATE OR REPLACE FUNCTION wlt_guard_payment_reconciliation_resolution()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    payment_status TEXT;
BEGIN
    IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved'
       AND NEW.operation IN ('authorize', 'capture') THEN
        IF NEW.resolution_action NOT IN ('confirmed_success', 'confirmed_failed') THEN
            RAISE EXCEPTION 'payment reconciliation requires a confirmed provider resolution action'
                USING ERRCODE = '23514';
        END IF;

        SELECT status
        INTO payment_status
        FROM wlt_payment_sessions
        WHERE id = NEW.payment_session_id;

        IF payment_status IS NULL OR payment_status NOT IN ('authorized', 'captured', 'failed', 'expired') THEN
            RAISE EXCEPTION 'payment reconciliation cannot resolve before canonical payment transition (status=%)', payment_status
                USING ERRCODE = '23514';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_guard_payment_reconciliation_resolution
    ON wlt_reconciliation_cases;
CREATE TRIGGER trg_wlt_guard_payment_reconciliation_resolution
BEFORE UPDATE ON wlt_reconciliation_cases
FOR EACH ROW
EXECUTE FUNCTION wlt_guard_payment_reconciliation_resolution();

COMMIT;
