-- WLT-938: payment-session terminal statuses are final.
-- The provider/result state machine already rejects contradictory terminal
-- outcomes in application code. This database guard makes the invariant hold
-- for every writer, including maintenance SQL and future code paths.

BEGIN;

CREATE OR REPLACE FUNCTION wlt_guard_payment_session_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IN ('captured', 'cod_collected', 'failed', 'expired')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'payment session terminal status cannot transition from % to %', OLD.status, NEW.status
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_payment_session_terminal_status_guard
    ON wlt_payment_sessions;
CREATE TRIGGER trg_wlt_payment_session_terminal_status_guard
    BEFORE UPDATE OF status ON wlt_payment_sessions
    FOR EACH ROW
    EXECUTE FUNCTION wlt_guard_payment_session_terminal_status();

COMMENT ON FUNCTION wlt_guard_payment_session_terminal_status() IS
    'WLT payment-session terminal outcomes are final; contradictory outcomes fail closed.';

COMMIT;
