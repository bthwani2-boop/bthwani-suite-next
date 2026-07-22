-- WLT-033: JRN-027 sovereign subscription lifecycle.
--
-- WLT remains the sole owner of paid product terms, captured-payment evidence,
-- effective subscription periods, loyalty entries, compensation and recurring
-- revenue truth. DSH stores only an operational projection and WLT references.

ALTER TABLE wlt_commercial_products
    ADD COLUMN IF NOT EXISTS activation_points BIGINT NOT NULL DEFAULT 0
        CHECK (activation_points >= 0);

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1
        CHECK (version > 0);

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS last_renewal_payment_session_id TEXT
        REFERENCES wlt_payment_sessions(id);

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS compensation_status TEXT NOT NULL DEFAULT 'not_required';

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS compensation_reference TEXT;

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS lifecycle_correlation_id TEXT;

ALTER TABLE wlt_client_subscriptions
    DROP CONSTRAINT IF EXISTS wlt_client_subscriptions_compensation_status_chk;

ALTER TABLE wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_compensation_status_chk CHECK (
        compensation_status IN ('not_required', 'pending', 'completed', 'failed')
    );

ALTER TABLE wlt_client_subscriptions
    DROP CONSTRAINT IF EXISTS wlt_client_subscriptions_compensation_reference_chk;

ALTER TABLE wlt_client_subscriptions
    ADD CONSTRAINT wlt_client_subscriptions_compensation_reference_chk CHECK (
        (compensation_status = 'completed' AND btrim(COALESCE(compensation_reference, '')) <> '')
        OR (compensation_status <> 'completed')
    );

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_subscription_last_renewal_payment
    ON wlt_client_subscriptions(last_renewal_payment_session_id)
    WHERE last_renewal_payment_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wlt_client_subscriptions_due
    ON wlt_client_subscriptions(ends_at, status)
    WHERE status = 'active';

CREATE TABLE IF NOT EXISTS wlt_subscription_lifecycle_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES wlt_client_subscriptions(id),
    client_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'activated',
        'renewed',
        'cancellation_scheduled',
        'cancelled',
        'expired',
        'compensation_requested',
        'compensation_completed',
        'compensation_failed'
    )),
    from_status TEXT,
    to_status TEXT NOT NULL,
    payment_session_id TEXT REFERENCES wlt_payment_sessions(id),
    subscription_purchase_id TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    correlation_id TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wlt_subscription_lifecycle_events_subscription
    ON wlt_subscription_lifecycle_events(subscription_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wlt_subscription_lifecycle_events_client
    ON wlt_subscription_lifecycle_events(client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS wlt_subscription_compensations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL UNIQUE REFERENCES wlt_client_subscriptions(id),
    client_id TEXT NOT NULL,
    payment_session_id TEXT NOT NULL REFERENCES wlt_payment_sessions(id),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'completed', 'failed')),
    reason TEXT NOT NULL CHECK (btrim(reason) <> ''),
    refund_reference TEXT,
    amount_minor_units BIGINT NOT NULL CHECK (amount_minor_units > 0),
    currency TEXT NOT NULL CHECK (btrim(currency) <> ''),
    requested_by_actor_id TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT wlt_subscription_compensation_completion_chk CHECK (
        (status = 'completed' AND btrim(COALESCE(refund_reference, '')) <> '' AND completed_at IS NOT NULL)
        OR (status <> 'completed' AND completed_at IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_wlt_subscription_compensations_status
    ON wlt_subscription_compensations(status, updated_at DESC);

CREATE OR REPLACE FUNCTION wlt_reject_subscription_lifecycle_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'wlt_subscription_lifecycle_events is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_subscription_lifecycle_events_no_update
    ON wlt_subscription_lifecycle_events;
CREATE TRIGGER trg_wlt_subscription_lifecycle_events_no_update
BEFORE UPDATE ON wlt_subscription_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION wlt_reject_subscription_lifecycle_event_mutation();

DROP TRIGGER IF EXISTS trg_wlt_subscription_lifecycle_events_no_delete
    ON wlt_subscription_lifecycle_events;
CREATE TRIGGER trg_wlt_subscription_lifecycle_events_no_delete
BEFORE DELETE ON wlt_subscription_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION wlt_reject_subscription_lifecycle_event_mutation();

CREATE OR REPLACE FUNCTION wlt_guard_subscription_lifecycle_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.client_id <> OLD.client_id
       OR NEW.product_reference <> OLD.product_reference
       OR COALESCE(NEW.subscription_purchase_id, '') <> COALESCE(OLD.subscription_purchase_id, '')
       OR COALESCE(NEW.payment_session_id::TEXT, '') <> COALESCE(OLD.payment_session_id::TEXT, '') THEN
        RAISE EXCEPTION 'subscription identity and activation evidence are immutable'
            USING ERRCODE = '23514';
    END IF;

    IF OLD.status IN ('cancelled', 'expired')
       AND ROW(NEW.status, NEW.ends_at, NEW.cancel_at_period_end) IS DISTINCT FROM
           ROW(OLD.status, OLD.ends_at, OLD.cancel_at_period_end) THEN
        RAISE EXCEPTION 'cancelled or expired subscription lifecycle is terminal'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.ends_at IS NOT NULL AND NEW.ends_at <= NEW.starts_at THEN
        RAISE EXCEPTION 'subscription end must remain after start'
            USING ERRCODE = '23514';
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_guard_subscription_lifecycle_update
    ON wlt_client_subscriptions;
CREATE TRIGGER trg_wlt_guard_subscription_lifecycle_update
BEFORE UPDATE ON wlt_client_subscriptions
FOR EACH ROW EXECUTE FUNCTION wlt_guard_subscription_lifecycle_update();

CREATE OR REPLACE FUNCTION wlt_guard_subscription_compensation_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'completed'
       AND ROW(NEW.status, NEW.refund_reference, NEW.amount_minor_units, NEW.currency) IS DISTINCT FROM
           ROW(OLD.status, OLD.refund_reference, OLD.amount_minor_units, OLD.currency) THEN
        RAISE EXCEPTION 'completed subscription compensation is immutable'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.subscription_id <> OLD.subscription_id
       OR NEW.client_id <> OLD.client_id
       OR NEW.payment_session_id <> OLD.payment_session_id
       OR NEW.amount_minor_units <> OLD.amount_minor_units
       OR NEW.currency <> OLD.currency THEN
        RAISE EXCEPTION 'subscription compensation source identity is immutable'
            USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_guard_subscription_compensation_update
    ON wlt_subscription_compensations;
CREATE TRIGGER trg_wlt_guard_subscription_compensation_update
BEFORE UPDATE ON wlt_subscription_compensations
FOR EACH ROW EXECUTE FUNCTION wlt_guard_subscription_compensation_update();
