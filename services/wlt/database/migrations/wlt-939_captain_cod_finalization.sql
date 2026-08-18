-- WLT-939: replace COD cash custody/remittance with captain-funded finalization.
-- Historical COD custody rows remain immutable evidence; new COD completion is
-- represented only by wlt_cod_reservations plus its canonical ledger posting.

BEGIN;

ALTER TABLE wlt_cod_reservations
  ADD COLUMN IF NOT EXISTS checkout_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS finalization_ledger_transaction_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS wlt_cod_reservations_checkout_intent_idx
  ON wlt_cod_reservations(operator_context_id, checkout_intent_id)
  WHERE checkout_intent_id IS NOT NULL AND btrim(checkout_intent_id) <> '';

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_status_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_status_chk
  CHECK (status IN (
    'reference_created','pending_provider','authorization_pending','authorized',
    'capture_pending','captured','cod_pending','cod_collected','cod_finalized',
    'failed','expired','provider_result_unknown'
  ));

CREATE OR REPLACE FUNCTION wlt_guard_payment_session_terminal_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status IN ('captured', 'cod_collected', 'cod_finalized', 'failed', 'expired')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'payment session terminal status cannot transition from % to %', OLD.status, NEW.status
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON TABLE wlt_cod_reservations IS
  'Canonical captain-funded COD exposure. reserved releases on a governed cancellation or finalizes once into the WLT ledger; no cash collection or remittance liability is created.';
COMMENT ON COLUMN wlt_cod_reservations.checkout_intent_id IS
  'Immutable WLT payment-session identity bound to the reservation at captain assignment.';
COMMENT ON COLUMN wlt_cod_reservations.finalization_ledger_transaction_id IS
  'The one canonical WLT ledger posting that debits the captain-funded COD exposure.';

COMMIT;
