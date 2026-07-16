-- WLT-015: provider_result_unknown session status + reconciliation cases.
--
-- AuthorizeSessionWithProvider / CaptureSessionWithProvider previously
-- treated ANY error from the financial provider call the same way: mark the
-- session 'failed' and notify DSH. That is correct for a decline the
-- provider explicitly responded with (a provider.Error), but wrong for a
-- network timeout/connection failure or an unrecognized 2xx response body --
-- in those cases WLT genuinely does not know whether the provider actually
-- processed the charge. Silently calling that 'failed' can lose a real
-- charge from WLT's books, and a naive retry against a session wrongly
-- marked 'failed' risks a double charge.
--
-- This migration adds a new 'provider_result_unknown' status for exactly
-- that ambiguous case, and a wlt_reconciliation_cases table to make each
-- ambiguous outcome a durable, queryable record instead of an indistinguishable
-- 'failed' session. Resolving these cases (an operator confirming the true
-- outcome with the provider out-of-band) is out of scope for this round --
-- only the open-case record is added here.

ALTER TABLE wlt_payment_sessions
  DROP CONSTRAINT IF EXISTS wlt_payment_sessions_status_chk;

ALTER TABLE wlt_payment_sessions
  ADD CONSTRAINT wlt_payment_sessions_status_chk
  CHECK (status IN ('reference_created','pending_provider','authorized','captured','cod_pending','cod_collected','failed','expired','provider_result_unknown'));

CREATE TABLE IF NOT EXISTS wlt_reconciliation_cases (
    id                 text PRIMARY KEY DEFAULT ('wrec_' || gen_random_uuid()::text),
    payment_session_id text NOT NULL REFERENCES wlt_payment_sessions(id),
    operation          text NOT NULL CHECK (operation IN ('authorize', 'capture')),
    trigger_reason     text NOT NULL,
    status             text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
    resolution         text,
    resolved_at        timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wlt_reconciliation_cases_session_idx ON wlt_reconciliation_cases(payment_session_id);
CREATE INDEX IF NOT EXISTS wlt_reconciliation_cases_open_idx ON wlt_reconciliation_cases(status) WHERE status = 'open';
