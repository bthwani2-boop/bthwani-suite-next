-- DSH-1016: preserve WLT terminal-outcome integrity at the projection boundary.
-- WLT is the financial authority and rejects terminal state changes. This
-- constraint prevents a contradictory second terminal receipt from becoming
-- a second DSH projection even if an invalid internal event reaches DSH.

BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS dsh_special_request_wlt_terminal_outcome_unique
    ON dsh_special_request_wlt_event_receipts
        (operator_context_id, special_request_id, payment_session_id, wlt_status)
    WHERE wlt_status IN ('captured', 'cod_collected', 'failed', 'expired');

COMMIT;
