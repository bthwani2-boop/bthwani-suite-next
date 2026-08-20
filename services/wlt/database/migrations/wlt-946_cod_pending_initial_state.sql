-- WLT-946: align live COD sessions with the captain-funded finalization
-- lifecycle. New COD sessions are created in cod_pending by the application;
-- this repairs pre-migration sessions that are still at the non-terminal
-- reference_created state without touching captured, finalized, failed, or
-- expired financial history.

BEGIN;

UPDATE wlt_payment_sessions
SET status = 'cod_pending',
    updated_at = NOW()
WHERE payment_method IN ('cod', 'mixed')
  AND COALESCE(cash_on_delivery_amount_minor_units, 0) > 0
  AND status = 'reference_created';

COMMIT;
