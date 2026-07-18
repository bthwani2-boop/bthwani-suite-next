-- WLT-030: subscription-specific payment-session source identity.
--
-- A paid subscription must never be activated from an order or special-request
-- payment session merely because amount/client/currency happen to match. This
-- migration adds a third, explicit source identity for subscription purchases
-- and binds it to one WLT commercial product.

ALTER TABLE wlt_payment_sessions
    ADD COLUMN IF NOT EXISTS subscription_purchase_id TEXT;

ALTER TABLE wlt_payment_sessions
    ADD COLUMN IF NOT EXISTS commercial_product_reference TEXT
        REFERENCES wlt_commercial_products(reference);

DROP INDEX IF EXISTS wlt_payment_sessions_subscription_purchase_idx;
CREATE UNIQUE INDEX wlt_payment_sessions_subscription_purchase_idx
    ON wlt_payment_sessions(subscription_purchase_id)
    WHERE subscription_purchase_id IS NOT NULL;

ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_source_xor_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_source_xor_chk CHECK (
        num_nonnulls(checkout_intent_id, special_request_id, subscription_purchase_id) = 1
    );

ALTER TABLE wlt_payment_sessions
    DROP CONSTRAINT IF EXISTS wlt_payment_sessions_subscription_product_chk;

ALTER TABLE wlt_payment_sessions
    ADD CONSTRAINT wlt_payment_sessions_subscription_product_chk CHECK (
        (subscription_purchase_id IS NOT NULL AND commercial_product_reference IS NOT NULL)
        OR
        (subscription_purchase_id IS NULL AND commercial_product_reference IS NULL)
    );

ALTER TABLE wlt_client_subscriptions
    ADD COLUMN IF NOT EXISTS subscription_purchase_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_wlt_client_subscription_purchase
    ON wlt_client_subscriptions(subscription_purchase_id)
    WHERE subscription_purchase_id IS NOT NULL;
