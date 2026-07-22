-- DSH-103: JRN-027 operational subscription orchestration.
--
-- DSH owns the purchase workflow, tenant/client isolation and WLT references.
-- Money, payment capture, entitlement periods, loyalty balances and compensation
-- completion remain exclusively owned by WLT.

ALTER TABLE dsh_subscription_purchases
    ALTER COLUMN wlt_payment_session_id DROP NOT NULL;

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS wlt_subscription_id TEXT;

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS renewal_of_purchase_id TEXT
        REFERENCES dsh_subscription_purchases(id);

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS lifecycle_version INTEGER NOT NULL DEFAULT 1
        CHECK (lifecycle_version > 0);

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS compensation_status TEXT NOT NULL DEFAULT 'not_required';

ALTER TABLE dsh_subscription_purchases
    ADD COLUMN IF NOT EXISTS compensation_reference TEXT;

ALTER TABLE dsh_subscription_purchases
    DROP CONSTRAINT IF EXISTS dsh_subscription_purchases_status_check;

ALTER TABLE dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_status_check CHECK (status IN (
        'initiated',
        'pending_payment',
        'payment_captured',
        'active',
        'renewal_pending_payment',
        'renewed',
        'cancelled',
        'expired',
        'compensation_pending',
        'compensated',
        'failed'
    ));

ALTER TABLE dsh_subscription_purchases
    DROP CONSTRAINT IF EXISTS dsh_subscription_purchases_compensation_status_chk;

ALTER TABLE dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_compensation_status_chk CHECK (
        compensation_status IN ('not_required', 'pending', 'completed', 'failed')
    );

ALTER TABLE dsh_subscription_purchases
    DROP CONSTRAINT IF EXISTS dsh_subscription_purchases_payment_reference_chk;

ALTER TABLE dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_payment_reference_chk CHECK (
        (status = 'initiated' AND wlt_payment_session_id IS NULL)
        OR (status <> 'initiated' AND btrim(COALESCE(wlt_payment_session_id, '')) <> '')
    );

ALTER TABLE dsh_subscription_purchases
    DROP CONSTRAINT IF EXISTS dsh_subscription_purchases_active_reference_chk;

ALTER TABLE dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_active_reference_chk CHECK (
        status NOT IN ('active', 'renewed', 'cancelled', 'expired', 'compensation_pending', 'compensated')
        OR btrim(COALESCE(wlt_subscription_id, '')) <> ''
    );

ALTER TABLE dsh_subscription_purchases
    DROP CONSTRAINT IF EXISTS dsh_subscription_purchases_cancellation_reason_chk;

ALTER TABLE dsh_subscription_purchases
    ADD CONSTRAINT dsh_subscription_purchases_cancellation_reason_chk CHECK (
        status <> 'cancelled'
        OR (cancelled_at IS NOT NULL AND btrim(COALESCE(cancellation_reason, '')) <> '')
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_subscription_purchase_wlt_subscription
    ON dsh_subscription_purchases(wlt_subscription_id)
    WHERE wlt_subscription_id IS NOT NULL AND renewal_of_purchase_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_purchases_client_lifecycle
    ON dsh_subscription_purchases(tenant_id, client_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_purchases_wlt_subscription
    ON dsh_subscription_purchases(wlt_subscription_id, updated_at DESC)
    WHERE wlt_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS dsh_subscription_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id TEXT NOT NULL REFERENCES dsh_subscription_purchases(id),
    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'purchase_initiated',
        'payment_session_bound',
        'payment_captured',
        'activated',
        'renewal_initiated',
        'renewed',
        'cancelled',
        'expired',
        'compensation_pending',
        'compensated',
        'failed'
    )),
    from_status TEXT,
    to_status TEXT NOT NULL,
    wlt_payment_session_id TEXT,
    wlt_subscription_id TEXT,
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (purchase_id, idempotency_key, event_type)
);

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_lifecycle_events_purchase
    ON dsh_subscription_lifecycle_events(purchase_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_lifecycle_events_client
    ON dsh_subscription_lifecycle_events(tenant_id, client_id, created_at DESC);

CREATE OR REPLACE FUNCTION dsh_reject_subscription_lifecycle_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'dsh_subscription_lifecycle_events is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_subscription_lifecycle_events_no_update
    ON dsh_subscription_lifecycle_events;
CREATE TRIGGER trg_dsh_subscription_lifecycle_events_no_update
BEFORE UPDATE ON dsh_subscription_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION dsh_reject_subscription_lifecycle_event_mutation();

DROP TRIGGER IF EXISTS trg_dsh_subscription_lifecycle_events_no_delete
    ON dsh_subscription_lifecycle_events;
CREATE TRIGGER trg_dsh_subscription_lifecycle_events_no_delete
BEFORE DELETE ON dsh_subscription_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION dsh_reject_subscription_lifecycle_event_mutation();

CREATE OR REPLACE FUNCTION dsh_guard_subscription_purchase_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.plan_id <> OLD.plan_id
       OR NEW.client_id <> OLD.client_id
       OR NEW.tenant_id <> OLD.tenant_id
       OR NEW.wlt_product_reference <> OLD.wlt_product_reference
       OR NEW.idempotency_key <> OLD.idempotency_key
       OR COALESCE(NEW.renewal_of_purchase_id, '') <> COALESCE(OLD.renewal_of_purchase_id, '') THEN
        RAISE EXCEPTION 'subscription purchase identity and WLT product reference are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_payment_session_id IS NOT NULL
       AND COALESCE(NEW.wlt_payment_session_id, '') <> OLD.wlt_payment_session_id THEN
        RAISE EXCEPTION 'bound WLT payment session is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.wlt_subscription_id IS NOT NULL
       AND COALESCE(NEW.wlt_subscription_id, '') <> OLD.wlt_subscription_id THEN
        RAISE EXCEPTION 'bound WLT subscription reference is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status IN ('cancelled', 'expired', 'compensated', 'failed')
       AND NEW.status <> OLD.status THEN
        RAISE EXCEPTION 'terminal subscription purchase state cannot transition'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'active'
       AND NEW.status NOT IN ('active', 'renewal_pending_payment', 'cancelled', 'expired', 'compensation_pending') THEN
        RAISE EXCEPTION 'invalid transition from active subscription purchase'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'cancelled'
       AND (NEW.cancelled_at IS NULL OR btrim(COALESCE(NEW.cancellation_reason, '')) = '') THEN
        RAISE EXCEPTION 'cancellation timestamp and reason are required'
            USING ERRCODE = '23514';
    END IF;

    NEW.lifecycle_version := OLD.lifecycle_version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_subscription_purchase_update
    ON dsh_subscription_purchases;
CREATE TRIGGER trg_dsh_guard_subscription_purchase_update
BEFORE UPDATE ON dsh_subscription_purchases
FOR EACH ROW EXECUTE FUNCTION dsh_guard_subscription_purchase_update();
