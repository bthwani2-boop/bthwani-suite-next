-- DSH-1018: one terminal WLT outcome per scoped payment session.
-- WLT remains the financial authority; DSH must reject contradictory terminal
-- projections at the database boundary, including concurrent delivery races.

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM dsh_special_request_wlt_event_receipts
    WHERE wlt_status IN ('captured', 'cod_collected', 'failed', 'expired')
    GROUP BY operator_context_id, special_request_id, payment_session_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'cannot install canonical WLT terminal guard: existing contradictory terminal receipts require WLT reconciliation';
  END IF;
END
$$;

DROP INDEX IF EXISTS dsh_special_request_wlt_terminal_outcome_unique;

CREATE UNIQUE INDEX dsh_special_request_wlt_terminal_outcome_unique
    ON dsh_special_request_wlt_event_receipts
        (operator_context_id, special_request_id, payment_session_id)
    WHERE wlt_status IN ('captured', 'cod_collected', 'failed', 'expired');

COMMIT;
