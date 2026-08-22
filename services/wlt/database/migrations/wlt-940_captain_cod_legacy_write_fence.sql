-- WLT-940: make the captain-funded COD cutover enforceable at the database
-- boundary. Historical cod_collected rows are preserved for reconciliation,
-- but the live payment-session state machine may no longer create or update
-- that retired cash-collection state.

BEGIN;

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_status_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_status_chk
  CHECK (status IN (
    'reference_created','pending_provider','authorization_pending','authorized',
    'capture_pending','captured','cod_pending','cod_finalized',
    'failed','expired','provider_result_unknown'
  )) NOT VALID;

CREATE OR REPLACE FUNCTION wlt_guard_payment_session_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IN ('captured', 'cod_finalized', 'failed', 'expired')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'payment session terminal status cannot transition from %', OLD.status
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON CONSTRAINT wlt_payment_sessions_status_chk ON wlt_payment_sessions IS
  'Live payment sessions use captain-funded cod_pending -> cod_finalized. Historical cod_collected rows remain unvalidated and require explicit reconciliation before archival.';

COMMIT;
