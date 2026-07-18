-- DSH-066: governed subscription purchase workflow.
--
-- This table stores DSH workflow state and WLT references only. It does not
-- store money, payment status truth, loyalty balances, invoices, or ledger
-- entries. Those remain exclusively owned by WLT.

CREATE TABLE IF NOT EXISTS dsh_subscription_purchases (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    client_id TEXT NOT NULL,
    plan_id UUID NOT NULL REFERENCES dsh_subscription_plans(id),
    wlt_product_reference TEXT NOT NULL,
    wlt_payment_session_id TEXT NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('wallet', 'mixed', 'official_wallet')),
    status TEXT NOT NULL DEFAULT 'pending_payment'
        CHECK (status IN ('pending_payment', 'payment_captured', 'active', 'failed', 'cancelled')),
    idempotency_key TEXT NOT NULL,
    correlation_id TEXT NOT NULL,
    failure_code TEXT,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, client_id, idempotency_key),
    UNIQUE (wlt_payment_session_id)
);

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_purchases_client
    ON dsh_subscription_purchases(tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dsh_subscription_purchases_status
    ON dsh_subscription_purchases(status, updated_at DESC);

CREATE OR REPLACE FUNCTION dsh_guard_subscription_purchase_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status = 'active' AND NEW.status <> 'active' THEN
        RAISE EXCEPTION 'active subscription purchase is terminal in DSH; WLT owns cancellation and reversal'
            USING ERRCODE = '23514';
    END IF;
    IF NEW.plan_id <> OLD.plan_id
       OR NEW.client_id <> OLD.client_id
       OR NEW.tenant_id <> OLD.tenant_id
       OR NEW.wlt_product_reference <> OLD.wlt_product_reference
       OR NEW.wlt_payment_session_id <> OLD.wlt_payment_session_id
       OR NEW.idempotency_key <> OLD.idempotency_key THEN
        RAISE EXCEPTION 'subscription purchase identity and WLT references are immutable'
            USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_subscription_purchase_update ON dsh_subscription_purchases;
CREATE TRIGGER trg_dsh_guard_subscription_purchase_update
BEFORE UPDATE ON dsh_subscription_purchases
FOR EACH ROW
EXECUTE FUNCTION dsh_guard_subscription_purchase_update();
