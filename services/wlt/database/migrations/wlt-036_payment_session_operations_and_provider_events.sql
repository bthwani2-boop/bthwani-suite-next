-- WLT-036: JRN-034 governed payment-operation replay, provider events and
-- capture-ledger cross references.
--
-- Authorize/capture provider calls are high-risk at-most-once operations. The
-- state claim in application code prevents concurrent calls, while this durable
-- receipt table makes a caller retry with the same Idempotency-Key replay-safe
-- across process restarts. Provider events are append-only and deduplicated by
-- their provider event identity plus a payload hash conflict guard.

ALTER TABLE wlt_payment_sessions
  ADD COLUMN IF NOT EXISTS capture_ledger_transaction_id text REFERENCES wlt_ledger_transactions(id),
  ADD COLUMN IF NOT EXISTS last_provider_event_id text,
  ADD COLUMN IF NOT EXISTS last_provider_status text NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_sessions_capture_ledger_uq
  ON wlt_payment_sessions (capture_ledger_transaction_id)
  WHERE capture_ledger_transaction_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS wlt_payment_operation_receipts (
  id                    text PRIMARY KEY DEFAULT ('wpor_' || gen_random_uuid()::text),
  tenant_id             text NOT NULL,
  payment_session_id    text NOT NULL REFERENCES wlt_payment_sessions(id),
  operation             text NOT NULL,
  idempotency_key       text NOT NULL,
  request_hash          text NOT NULL,
  state                 text NOT NULL DEFAULT 'in_progress',
  response_status       text NOT NULL DEFAULT '',
  provider_reference    text NOT NULL DEFAULT '',
  error_code            text NOT NULL DEFAULT '',
  error_message         text NOT NULL DEFAULT '',
  correlation_id        text NOT NULL DEFAULT '',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  completed_at          timestamptz,
  CONSTRAINT wlt_payment_operation_receipts_operation_chk
    CHECK (operation IN ('authorize', 'capture', 'provider_status_refresh')),
  CONSTRAINT wlt_payment_operation_receipts_state_chk
    CHECK (state IN ('in_progress', 'completed', 'failed', 'provider_result_unknown')),
  CONSTRAINT wlt_payment_operation_receipts_key_chk
    CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  CONSTRAINT wlt_payment_operation_receipts_hash_chk
    CHECK (length(request_hash) = 64)
);

CREATE UNIQUE INDEX IF NOT EXISTS wlt_payment_operation_receipts_replay_uq
  ON wlt_payment_operation_receipts
    (tenant_id, payment_session_id, operation, idempotency_key);

CREATE INDEX IF NOT EXISTS wlt_payment_operation_receipts_session_idx
  ON wlt_payment_operation_receipts (tenant_id, payment_session_id, created_at DESC);

CREATE INDEX IF NOT EXISTS wlt_payment_operation_receipts_in_progress_idx
  ON wlt_payment_operation_receipts (updated_at)
  WHERE state = 'in_progress';

CREATE TABLE IF NOT EXISTS wlt_payment_provider_events (
  provider_event_id     text PRIMARY KEY,
  tenant_id             text NOT NULL,
  payment_session_id    text NOT NULL REFERENCES wlt_payment_sessions(id),
  event_type            text NOT NULL,
  provider_status       text NOT NULL,
  provider_reference    text NOT NULL DEFAULT '',
  payload_hash          text NOT NULL,
  signature_timestamp   timestamptz NOT NULL,
  occurred_at           timestamptz,
  processing_state      text NOT NULL DEFAULT 'received',
  processing_result     text NOT NULL DEFAULT '',
  received_at           timestamptz NOT NULL DEFAULT now(),
  processed_at          timestamptz,
  CONSTRAINT wlt_payment_provider_events_type_chk
    CHECK (event_type IN ('payment.authorized', 'payment.captured', 'payment.failed', 'payment.expired')),
  CONSTRAINT wlt_payment_provider_events_status_chk
    CHECK (provider_status IN ('authorized', 'captured', 'failed', 'expired')),
  CONSTRAINT wlt_payment_provider_events_processing_chk
    CHECK (processing_state IN ('received', 'applied', 'ignored', 'conflict')),
  CONSTRAINT wlt_payment_provider_events_hash_chk
    CHECK (length(payload_hash) = 64)
);

CREATE INDEX IF NOT EXISTS wlt_payment_provider_events_session_idx
  ON wlt_payment_provider_events (tenant_id, payment_session_id, received_at DESC);

CREATE INDEX IF NOT EXISTS wlt_payment_provider_events_unprocessed_idx
  ON wlt_payment_provider_events (received_at)
  WHERE processing_state = 'received';
