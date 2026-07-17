-- WLT-025: sovereign commercial benefits data plane
--
-- WLT owns monetary subscription products, subscription payment evidence,
-- loyalty balances, and append-only points entries. DSH may own marketing
-- presentation and tier definitions, but it cannot mutate these financial
-- records directly.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS wlt_commercial_products (
    reference TEXT PRIMARY KEY,
    product_type TEXT NOT NULL CHECK (product_type IN ('subscription')),
    display_name TEXT NOT NULL,
    price_minor_units BIGINT NOT NULL CHECK (price_minor_units > 0),
    currency TEXT NOT NULL DEFAULT 'YER' CHECK (currency <> ''),
    billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'quarterly', 'annual')),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_actor_id TEXT NOT NULL,
    approved_by_actor_id TEXT,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_commercial_product_independent_approval_chk CHECK (
        status <> 'active'
        OR (
            approved_by_actor_id IS NOT NULL
            AND approved_by_actor_id <> created_by_actor_id
            AND approved_at IS NOT NULL
        )
    )
);

CREATE INDEX IF NOT EXISTS idx_wlt_commercial_products_status
    ON wlt_commercial_products(status, product_type);

CREATE TABLE IF NOT EXISTS wlt_loyalty_accounts (
    client_id TEXT PRIMARY KEY,
    points_balance BIGINT NOT NULL DEFAULT 0 CHECK (points_balance >= 0),
    lifetime_points BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
    tier_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wlt_loyalty_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL REFERENCES wlt_loyalty_accounts(client_id),
    direction TEXT NOT NULL CHECK (direction IN ('earn', 'burn', 'expire', 'reverse')),
    points BIGINT NOT NULL CHECK (points > 0),
    balance_after BIGINT NOT NULL CHECK (balance_after >= 0),
    source_type TEXT NOT NULL CHECK (source_type <> ''),
    source_id TEXT NOT NULL CHECK (source_id <> ''),
    reversal_of UUID REFERENCES wlt_loyalty_entries(id),
    idempotency_key TEXT NOT NULL UNIQUE,
    correlation_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_loyalty_reversal_reference_chk CHECK (
        (direction = 'reverse' AND reversal_of IS NOT NULL)
        OR (direction <> 'reverse' AND reversal_of IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_wlt_loyalty_entries_client_created
    ON wlt_loyalty_entries(client_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_loyalty_single_reversal
    ON wlt_loyalty_entries(reversal_of)
    WHERE reversal_of IS NOT NULL;

CREATE TABLE IF NOT EXISTS wlt_client_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id TEXT NOT NULL,
    product_reference TEXT NOT NULL REFERENCES wlt_commercial_products(reference),
    status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
    payment_session_id UUID REFERENCES wlt_payment_sessions(id),
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT wlt_subscription_end_after_start_chk CHECK (
        ends_at IS NULL OR ends_at > starts_at
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_client_active_subscription
    ON wlt_client_subscriptions(client_id)
    WHERE status = 'active';

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_subscription_payment_session
    ON wlt_client_subscriptions(payment_session_id)
    WHERE payment_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wlt_client_subscriptions_product
    ON wlt_client_subscriptions(product_reference, status);

CREATE OR REPLACE FUNCTION wlt_reject_loyalty_entry_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'wlt_loyalty_entries is append-only'
        USING ERRCODE = '55000';
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_loyalty_entries_no_update ON wlt_loyalty_entries;
CREATE TRIGGER trg_wlt_loyalty_entries_no_update
BEFORE UPDATE ON wlt_loyalty_entries
FOR EACH ROW EXECUTE FUNCTION wlt_reject_loyalty_entry_mutation();

DROP TRIGGER IF EXISTS trg_wlt_loyalty_entries_no_delete ON wlt_loyalty_entries;
CREATE TRIGGER trg_wlt_loyalty_entries_no_delete
BEFORE DELETE ON wlt_loyalty_entries
FOR EACH ROW EXECUTE FUNCTION wlt_reject_loyalty_entry_mutation();

CREATE OR REPLACE FUNCTION wlt_guard_commercial_product_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.display_name,
            OLD.price_minor_units,
            OLD.currency,
            OLD.billing_cycle
       ) IS DISTINCT FROM ROW(
            NEW.display_name,
            NEW.price_minor_units,
            NEW.currency,
            NEW.billing_cycle
       ) THEN
        RAISE EXCEPTION 'active WLT commercial product terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent WLT commercial product approval is required'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    NEW.version := OLD.version + 1;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wlt_guard_commercial_product_update ON wlt_commercial_products;
CREATE TRIGGER trg_wlt_guard_commercial_product_update
BEFORE UPDATE ON wlt_commercial_products
FOR EACH ROW EXECUTE FUNCTION wlt_guard_commercial_product_update();
