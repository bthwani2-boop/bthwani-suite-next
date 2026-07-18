-- DSH-067: atomically enqueue promotion-funding closure transitions.
--
-- These triggers cover every surface and code path that cancels a checkout or
-- order. The WLT call remains asynchronous, idempotent, and retryable through
-- dsh_promotion_funding_outbox.

CREATE OR REPLACE FUNCTION dsh_enqueue_coupon_funding_release_on_checkout_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.state = 'cancelled' AND OLD.state IS DISTINCT FROM NEW.state THEN
        INSERT INTO dsh_promotion_funding_outbox (
            event_type,
            tenant_id,
            checkout_intent_id,
            coupon_redemption_id,
            wlt_funding_reservation_id,
            order_id,
            reason,
            idempotency_key,
            correlation_id
        )
        SELECT
            'release',
            r.funding_tenant_id,
            r.checkout_intent_id,
            r.id,
            r.wlt_funding_reservation_id,
            NULL,
            'checkout_cancelled',
            'dsh-promotion-funding-release:' || r.id::TEXT || ':checkout_cancelled',
            NEW.id::TEXT
        FROM dsh_coupon_redemptions r
        WHERE r.checkout_intent_id = NEW.id
          AND r.funding_status = 'reserved'
          AND r.funding_tenant_id IS NOT NULL
          AND r.wlt_funding_reservation_id IS NOT NULL
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_coupon_funding_release_on_checkout_cancel
    ON dsh_checkout_intents;
CREATE TRIGGER trg_dsh_coupon_funding_release_on_checkout_cancel
AFTER UPDATE OF state ON dsh_checkout_intents
FOR EACH ROW
EXECUTE FUNCTION dsh_enqueue_coupon_funding_release_on_checkout_cancel();

CREATE OR REPLACE FUNCTION dsh_enqueue_coupon_funding_reverse_on_order_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO dsh_promotion_funding_outbox (
            event_type,
            tenant_id,
            checkout_intent_id,
            coupon_redemption_id,
            wlt_funding_reservation_id,
            order_id,
            reason,
            idempotency_key,
            correlation_id
        )
        SELECT
            'reverse',
            r.funding_tenant_id,
            r.checkout_intent_id,
            r.id,
            r.wlt_funding_reservation_id,
            NEW.id,
            COALESCE(NULLIF(NEW.rejection_reason, ''), 'order_cancelled'),
            'dsh-promotion-funding-reverse:' || r.id::TEXT || ':' || NEW.id::TEXT,
            NEW.id::TEXT
        FROM dsh_coupon_redemptions r
        WHERE r.checkout_intent_id = NEW.checkout_intent_id
          AND r.funding_status IN ('reserved', 'committed')
          AND r.funding_tenant_id IS NOT NULL
          AND r.wlt_funding_reservation_id IS NOT NULL
        ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_coupon_funding_reverse_on_order_cancel
    ON dsh_orders;
CREATE TRIGGER trg_dsh_coupon_funding_reverse_on_order_cancel
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_enqueue_coupon_funding_reverse_on_order_cancel();
