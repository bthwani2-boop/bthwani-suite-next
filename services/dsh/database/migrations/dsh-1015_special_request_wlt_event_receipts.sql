-- DSH-1015: atomic WLT event receipt and payment readback for special requests.
-- WLT remains the financial authority; DSH stores only the bounded event/readback
-- projection needed by its operational surfaces.

BEGIN;

ALTER TABLE dsh_special_requests
    ADD COLUMN IF NOT EXISTS last_wlt_status TEXT,
    ADD COLUMN IF NOT EXISTS last_wlt_event_at TIMESTAMPTZ;

ALTER TABLE dsh_special_requests
    DROP CONSTRAINT IF EXISTS dsh_special_request_last_wlt_status_chk;
ALTER TABLE dsh_special_requests
    ADD CONSTRAINT dsh_special_request_last_wlt_status_chk
    CHECK (last_wlt_status IS NULL OR last_wlt_status IN (
        'authorized', 'reference_created', 'cod_pending',
        'captured', 'cod_collected', 'failed', 'expired'
    ));

CREATE TABLE IF NOT EXISTS dsh_special_request_wlt_event_receipts (
    event_key              TEXT PRIMARY KEY,
    operator_context_id    TEXT NOT NULL CHECK (btrim(operator_context_id) <> ''),
    special_request_id     UUID NOT NULL REFERENCES dsh_special_requests(id) ON DELETE RESTRICT,
    payment_session_id     TEXT NOT NULL CHECK (btrim(payment_session_id) <> ''),
    wlt_status              TEXT NOT NULL CHECK (wlt_status IN (
        'authorized', 'reference_created', 'cod_pending',
        'captured', 'cod_collected', 'failed', 'expired'
    )),
    payload_hash            TEXT NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    correlation_id          TEXT NOT NULL DEFAULT '',
    delivery_attempt_count  INTEGER NOT NULL DEFAULT 1 CHECK (delivery_attempt_count > 0),
    received_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_received_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at              TIMESTAMPTZ,
    CONSTRAINT dsh_special_request_wlt_event_scope_unique
        UNIQUE (operator_context_id, special_request_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_special_request_wlt_event_request
    ON dsh_special_request_wlt_event_receipts(operator_context_id, special_request_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_special_request_wlt_event_session
    ON dsh_special_request_wlt_event_receipts(operator_context_id, payment_session_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_special_request_wlt_event_unapplied
    ON dsh_special_request_wlt_event_receipts(received_at)
    WHERE applied_at IS NULL;

CREATE OR REPLACE FUNCTION dsh_guard_special_request_wlt_event_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    request_context TEXT;
    request_session TEXT;
BEGIN
    SELECT operator_context_id, wlt_payment_session_id
      INTO request_context, request_session
      FROM dsh_special_requests
     WHERE id = NEW.special_request_id
     FOR SHARE;

    IF request_context IS NULL OR request_context <> NEW.operator_context_id THEN
        RAISE EXCEPTION 'WLT event OperatorContext does not match special request'
            USING ERRCODE = '23514';
    END IF;
    IF btrim(COALESCE(request_session, '')) = '' OR request_session <> NEW.payment_session_id THEN
        RAISE EXCEPTION 'WLT event payment session does not match special request'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_special_request_wlt_event_receipt
    ON dsh_special_request_wlt_event_receipts;
CREATE TRIGGER trg_dsh_guard_special_request_wlt_event_receipt
    BEFORE INSERT OR UPDATE OF operator_context_id, special_request_id, payment_session_id
    ON dsh_special_request_wlt_event_receipts
    FOR EACH ROW EXECUTE FUNCTION dsh_guard_special_request_wlt_event_receipt();

COMMIT;
