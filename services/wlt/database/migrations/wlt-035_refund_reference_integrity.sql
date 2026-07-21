-- WLT-035: Refund reference integrity and operational failure projection.
-- WLT derives money from its own payment session and rejects mismatched client
-- references even if an internal caller is compromised or incorrectly wired.

BEGIN;

ALTER TABLE wlt_refunds
    ADD COLUMN IF NOT EXISTS request_source TEXT NOT NULL DEFAULT 'order_cancellation',
    ADD COLUMN IF NOT EXISTS provider_refund_reference TEXT,
    ADD COLUMN IF NOT EXISTS failure_code TEXT,
    ADD COLUMN IF NOT EXISTS failure_message TEXT;

UPDATE wlt_refunds
SET reason = 'legacy_refund'
WHERE BTRIM(reason) = '';

ALTER TABLE wlt_refunds DROP CONSTRAINT IF EXISTS wlt_refunds_reason_required_check;
ALTER TABLE wlt_refunds ADD CONSTRAINT wlt_refunds_reason_required_check
    CHECK (BTRIM(reason) <> '');

ALTER TABLE wlt_refunds DROP CONSTRAINT IF EXISTS wlt_refunds_request_source_check;
ALTER TABLE wlt_refunds ADD CONSTRAINT wlt_refunds_request_source_check
    CHECK (request_source IN ('order_cancellation','support','operator_adjustment'));

CREATE OR REPLACE FUNCTION wlt_validate_refund_payment_reference()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_client_id TEXT;
    v_amount BIGINT;
    v_currency TEXT;
    v_status TEXT;
BEGIN
    SELECT client_id, amount_minor_units, currency, status
      INTO v_client_id, v_amount, v_currency, v_status
      FROM wlt_payment_sessions
     WHERE id = NEW.payment_session_id
     FOR SHARE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'payment session not found for refund';
    END IF;
    IF NEW.client_id <> v_client_id THEN
        RAISE EXCEPTION 'refund client does not match payment session owner';
    END IF;
    IF v_status NOT IN ('captured','cod_collected') THEN
        RAISE EXCEPTION 'payment session is not refundable';
    END IF;

    NEW.amount_minor_units := v_amount;
    NEW.currency := COALESCE(NULLIF(v_currency,''), 'YER');
    NEW.reason := BTRIM(NEW.reason);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_validate_refund_payment_reference
    ON wlt_refunds;
CREATE TRIGGER trg_wlt_validate_refund_payment_reference
BEFORE INSERT OR UPDATE OF payment_session_id, client_id, amount_minor_units, currency, reason
ON wlt_refunds
FOR EACH ROW
EXECUTE FUNCTION wlt_validate_refund_payment_reference();

CREATE INDEX IF NOT EXISTS idx_wlt_refunds_operational_queue
    ON wlt_refunds(status, updated_at DESC)
    WHERE status IN ('requested','approved','processing');

COMMIT;
