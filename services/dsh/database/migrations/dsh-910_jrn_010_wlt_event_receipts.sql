-- DSH-910 / JRN-010 FS-05, FS-08, FS-13, FS-15
-- Durable, tenant-scoped receipt ledger for WLT payment-session events.
-- DSH stores only the opaque WLT session reference and projected status; WLT
-- remains the financial authority for authorization, capture, refund and ledger truth.

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_state_check;

ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_state_check
    CHECK (state IN (
        'pending',
        'wlt_handoff_failed',
        'wlt_outcome_unknown',
        'payment_pending',
        'confirmed',
        'cancelled',
        'payment_confirmed',
        'payment_failed',
        'expired'
    ));

ALTER TABLE dsh_checkout_intents
    ADD COLUMN IF NOT EXISTS last_wlt_status TEXT,
    ADD COLUMN IF NOT EXISTS last_wlt_event_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reconciliation_attempt_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_last_wlt_status_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_last_wlt_status_chk
    CHECK (
        last_wlt_status IS NULL OR last_wlt_status IN (
            'authorized', 'reference_created', 'cod_pending',
            'captured', 'cod_collected', 'failed', 'expired'
        )
    );

ALTER TABLE dsh_checkout_intents
    DROP CONSTRAINT IF EXISTS dsh_checkout_intents_reconciliation_attempt_count_chk;
ALTER TABLE dsh_checkout_intents
    ADD CONSTRAINT dsh_checkout_intents_reconciliation_attempt_count_chk
    CHECK (reconciliation_attempt_count >= 0);

CREATE TABLE IF NOT EXISTS dsh_checkout_wlt_event_receipts (
    event_key              TEXT        PRIMARY KEY,
    tenant_id              TEXT        NOT NULL CHECK (btrim(tenant_id) <> ''),
    checkout_intent_id     UUID        NOT NULL REFERENCES dsh_checkout_intents(id) ON DELETE RESTRICT,
    payment_session_id     TEXT        NOT NULL CHECK (btrim(payment_session_id) <> ''),
    wlt_status             TEXT        NOT NULL CHECK (wlt_status IN (
        'authorized', 'reference_created', 'cod_pending',
        'captured', 'cod_collected', 'failed', 'expired'
    )),
    payload_hash           TEXT        NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
    correlation_id         TEXT        NOT NULL DEFAULT '',
    delivery_attempt_count INTEGER     NOT NULL DEFAULT 1 CHECK (delivery_attempt_count > 0),
    received_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_received_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_at             TIMESTAMPTZ,
    CONSTRAINT dsh_checkout_wlt_event_tenant_intent_unique
        UNIQUE (tenant_id, checkout_intent_id, event_key)
);

CREATE INDEX IF NOT EXISTS idx_dsh_checkout_wlt_event_receipts_intent
    ON dsh_checkout_wlt_event_receipts(tenant_id, checkout_intent_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_wlt_event_receipts_session
    ON dsh_checkout_wlt_event_receipts(tenant_id, payment_session_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_wlt_event_receipts_unapplied
    ON dsh_checkout_wlt_event_receipts(received_at)
    WHERE applied_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dsh_checkout_reconciliation_queue
    ON dsh_checkout_intents(updated_at, tenant_id)
    WHERE state = 'wlt_outcome_unknown';

CREATE OR REPLACE FUNCTION dsh_guard_checkout_wlt_event_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    intent_tenant TEXT;
    intent_session TEXT;
BEGIN
    SELECT tenant_id, wlt_payment_session_id
      INTO intent_tenant, intent_session
      FROM dsh_checkout_intents
     WHERE id = NEW.checkout_intent_id
     FOR SHARE;

    IF intent_tenant IS NULL OR intent_tenant <> NEW.tenant_id THEN
        RAISE EXCEPTION 'WLT event tenant does not match checkout intent tenant'
            USING ERRCODE = '23514';
    END IF;
    IF btrim(intent_session) = '' OR intent_session <> NEW.payment_session_id THEN
        RAISE EXCEPTION 'WLT event payment session does not match checkout intent'
            USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_checkout_wlt_event_receipt
    ON dsh_checkout_wlt_event_receipts;
CREATE TRIGGER trg_dsh_guard_checkout_wlt_event_receipt
BEFORE INSERT OR UPDATE OF tenant_id, checkout_intent_id, payment_session_id
ON dsh_checkout_wlt_event_receipts
FOR EACH ROW EXECUTE FUNCTION dsh_guard_checkout_wlt_event_receipt();
