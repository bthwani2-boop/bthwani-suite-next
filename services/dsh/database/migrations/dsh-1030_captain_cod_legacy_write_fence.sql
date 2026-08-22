-- DSH-1030: remove retired cash-collection status from live WLT projections.
-- Existing cod_collected projection rows remain historical readback evidence;
-- NOT VALID constraints preserve them while rejecting all new or changed rows.

BEGIN;

ALTER TABLE dsh_checkout_intents
  DROP CONSTRAINT IF EXISTS dsh_checkout_intents_last_wlt_status_chk;
ALTER TABLE dsh_checkout_intents
  ADD CONSTRAINT dsh_checkout_intents_last_wlt_status_chk
  CHECK (last_wlt_status IS NULL OR last_wlt_status IN (
    'authorized', 'reference_created', 'cod_pending',
    'captured', 'cod_finalized', 'failed', 'expired'
  )) NOT VALID;

ALTER TABLE dsh_checkout_wlt_event_receipts
  DROP CONSTRAINT IF EXISTS dsh_checkout_wlt_event_receipts_wlt_status_check;
ALTER TABLE dsh_checkout_wlt_event_receipts
  ADD CONSTRAINT dsh_checkout_wlt_event_receipts_wlt_status_check
  CHECK (wlt_status IN (
    'authorized', 'reference_created', 'cod_pending',
    'captured', 'cod_finalized', 'failed', 'expired'
  )) NOT VALID;

ALTER TABLE dsh_special_requests
  DROP CONSTRAINT IF EXISTS dsh_special_request_last_wlt_status_chk;
ALTER TABLE dsh_special_requests
  ADD CONSTRAINT dsh_special_request_last_wlt_status_chk
  CHECK (last_wlt_status IS NULL OR last_wlt_status IN (
    'authorized', 'reference_created', 'cod_pending',
    'captured', 'cod_finalized', 'failed', 'expired'
  )) NOT VALID;

ALTER TABLE dsh_special_request_wlt_event_receipts
  DROP CONSTRAINT IF EXISTS dsh_special_request_wlt_event_receipts_wlt_status_check;
ALTER TABLE dsh_special_request_wlt_event_receipts
  ADD CONSTRAINT dsh_special_request_wlt_event_receipts_wlt_status_check
  CHECK (wlt_status IN (
    'authorized', 'reference_created', 'cod_pending',
    'captured', 'cod_finalized', 'failed', 'expired'
  )) NOT VALID;

DROP INDEX IF EXISTS dsh_special_request_wlt_terminal_outcome_unique;
CREATE UNIQUE INDEX dsh_special_request_wlt_terminal_outcome_unique
  ON dsh_special_request_wlt_event_receipts
    (operator_context_id, special_request_id, payment_session_id)
  WHERE wlt_status IN ('captured', 'cod_finalized', 'failed', 'expired');

COMMIT;
