-- WLT-001: Payment Capture Lifecycle
-- Expand payment session statuses and add capture fields

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_status_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_status_chk
  CHECK (status IN ('reference_created','pending_provider','authorized','captured','cod_pending','cod_collected','failed','expired'));

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS amount_minor_units bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'YER',
  ADD COLUMN IF NOT EXISTS captured_at timestamptz;
