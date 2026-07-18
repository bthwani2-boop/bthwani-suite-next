-- DSH-067: bridge authoritative coupon discount to WLT promotion funding.

ALTER TABLE dsh_coupons
    ADD COLUMN IF NOT EXISTS platform_funding_percent NUMERIC(5,2) NOT NULL DEFAULT 100
        CHECK (platform_funding_percent >= 0 AND platform_funding_percent <= 100);

-- Store-scoped legacy coupons default to partner-funded; global coupons remain
-- platform-funded. Operators may change the split while the coupon is paused.
UPDATE dsh_coupons
SET platform_funding_percent=0
WHERE store_id IS NOT NULL AND platform_funding_percent=100 AND status<>'active';

ALTER TABLE dsh_coupons
    DROP CONSTRAINT IF EXISTS dsh_coupons_global_platform_funding_chk;
ALTER TABLE dsh_coupons
    ADD CONSTRAINT dsh_coupons_global_platform_funding_chk
    CHECK (store_id IS NOT NULL OR platform_funding_percent=100);

ALTER TABLE dsh_coupon_redemptions
    ADD COLUMN IF NOT EXISTS partner_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS platform_funded_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (platform_funded_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS partner_funded_minor_units BIGINT NOT NULL DEFAULT 0 CHECK (partner_funded_minor_units >= 0),
    ADD COLUMN IF NOT EXISTS wlt_funding_reservation_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS funding_status TEXT NOT NULL DEFAULT 'not_required'
        CHECK (funding_status IN ('not_required','pending_reserve','reserved','commit_pending','committed','release_pending','released','reverse_pending','reversed'));

ALTER TABLE dsh_coupon_redemptions
    DROP CONSTRAINT IF EXISTS dsh_coupon_redemptions_funding_total_chk;
ALTER TABLE dsh_coupon_redemptions
    ADD CONSTRAINT dsh_coupon_redemptions_funding_total_chk
    CHECK (
        discount_minor_units = platform_funded_minor_units + partner_funded_minor_units
        OR funding_status='not_required'
    );

ALTER TABLE dsh_wlt_outbox_events
    ALTER COLUMN order_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_wlt_outbox_checkout_event
    ON dsh_wlt_outbox_events(checkout_intent_id,event_type)
    WHERE order_id IS NULL;

CREATE OR REPLACE FUNCTION dsh_enqueue_promotion_funding_transition(
    p_redemption_id UUID,
    p_event_type TEXT,
    p_order_id UUID,
    p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    redemption RECORD;
BEGIN
    IF p_event_type NOT IN ('promotion_funding_commit','promotion_funding_release','promotion_funding_reverse') THEN
        RAISE EXCEPTION 'invalid promotion funding event type';
    END IF;

    SELECT r.*,i.client_id,i.checkout_intent_id,i.store_id,s.partner_id
    INTO redemption
    FROM dsh_coupon_redemptions r
    JOIN dsh_checkout_intents i ON i.id=r.checkout_intent_id
    JOIN dsh_stores s ON s.id=i.store_id
    WHERE r.id=p_redemption_id
    FOR UPDATE;

    IF NOT FOUND OR redemption.wlt_funding_reservation_id='' THEN
        RETURN;
    END IF;

    INSERT INTO dsh_wlt_outbox_events
        (event_type,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,tenant_id,payload)
    VALUES (
        p_event_type,p_order_id,'',COALESCE(redemption.partner_id,''),
        redemption.checkout_intent_id,redemption.client_id,'',
        jsonb_build_object(
            'fundingReservationId',redemption.wlt_funding_reservation_id,
            'couponRedemptionId',redemption.id,
            'reason',COALESCE(p_reason,''),
            'orderId',COALESCE(p_order_id::TEXT,'')
        )
    )
    ON CONFLICT DO NOTHING;

    UPDATE dsh_coupon_redemptions
    SET funding_status=CASE p_event_type
        WHEN 'promotion_funding_commit' THEN 'commit_pending'
        WHEN 'promotion_funding_release' THEN 'release_pending'
        WHEN 'promotion_funding_reverse' THEN 'reverse_pending'
    END,updated_at=NOW()
    WHERE id=p_redemption_id;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_apply_checkout_pricing_to_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    checkout_pricing RECORD;
    committed_rows INTEGER;
BEGIN
    SELECT subtotal_minor_units,delivery_fee_minor_units,discount_minor_units,
           total_minor_units,currency,pricing_snapshot_hash,coupon_id,
           coupon_redemption_id,coupon_code_last4
    INTO checkout_pricing
    FROM dsh_checkout_intents
    WHERE id=NEW.checkout_intent_id
    FOR UPDATE;

    IF NOT FOUND OR checkout_pricing.subtotal_minor_units<=0
       OR checkout_pricing.total_minor_units<=0
       OR checkout_pricing.total_minor_units<>
          checkout_pricing.subtotal_minor_units+checkout_pricing.delivery_fee_minor_units-checkout_pricing.discount_minor_units
       OR checkout_pricing.pricing_snapshot_hash='' THEN
        RAISE EXCEPTION 'checkout pricing snapshot is missing or invalid';
    END IF;

    NEW.subtotal_minor_units:=checkout_pricing.subtotal_minor_units;
    NEW.delivery_fee_minor_units:=checkout_pricing.delivery_fee_minor_units;
    NEW.discount_minor_units:=checkout_pricing.discount_minor_units;
    NEW.total_minor_units:=checkout_pricing.total_minor_units;
    NEW.currency:=checkout_pricing.currency;
    NEW.pricing_snapshot_hash:=checkout_pricing.pricing_snapshot_hash;
    NEW.coupon_id:=checkout_pricing.coupon_id;
    NEW.coupon_redemption_id:=checkout_pricing.coupon_redemption_id;
    NEW.coupon_code_last4:=checkout_pricing.coupon_code_last4;

    IF checkout_pricing.coupon_id IS NOT NULL THEN
        UPDATE dsh_coupon_redemptions
        SET status='committed',order_id=NEW.id,committed_at=NOW(),updated_at=NOW()
        WHERE id=checkout_pricing.coupon_redemption_id
          AND checkout_intent_id=NEW.checkout_intent_id
          AND status='reserved' AND reserved_until>NOW();
        GET DIAGNOSTICS committed_rows=ROW_COUNT;
        IF committed_rows<>1 THEN
            RAISE EXCEPTION 'coupon reservation is missing, expired, or already consumed';
        END IF;
        PERFORM dsh_enqueue_promotion_funding_transition(
            checkout_pricing.coupon_redemption_id,
            'promotion_funding_commit',
            NEW.id,
            'order_created'
        );
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_apply_confirmed_refund_effects(
    p_order_id UUID,
    p_refund_reference TEXT,
    p_reason TEXT
) RETURNS dsh_order_refund_effects
LANGUAGE plpgsql
AS $$
DECLARE
    existing_effect dsh_order_refund_effects;
    coupon_changed BOOLEAN := FALSE;
    loyalty_actioned BOOLEAN := FALSE;
    earn_event RECORD;
    redemption_id UUID;
BEGIN
    IF p_refund_reference IS NULL OR btrim(p_refund_reference)='' THEN
        RAISE EXCEPTION 'refund reference is required';
    END IF;

    SELECT * INTO existing_effect
    FROM dsh_order_refund_effects
    WHERE order_id=p_order_id OR refund_reference=p_refund_reference
    FOR UPDATE;
    IF FOUND THEN
        IF existing_effect.order_id<>p_order_id OR existing_effect.refund_reference<>p_refund_reference THEN
            RAISE EXCEPTION 'refund idempotency conflict';
        END IF;
        RETURN existing_effect;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM dsh_orders WHERE id=p_order_id) THEN
        RAISE EXCEPTION 'order not found';
    END IF;

    UPDATE dsh_coupon_redemptions
    SET status='reversed',reversed_at=NOW(),release_reason=COALESCE(p_reason,''),updated_at=NOW()
    WHERE order_id=p_order_id AND status='committed'
    RETURNING id INTO redemption_id;
    coupon_changed := FOUND;
    IF coupon_changed THEN
        PERFORM dsh_enqueue_promotion_funding_transition(
            redemption_id,'promotion_funding_reverse',p_order_id,COALESCE(p_reason,'refund_completed')
        );
    END IF;

    SELECT * INTO earn_event
    FROM dsh_wlt_outbox_events
    WHERE order_id=p_order_id AND event_type='loyalty_earned'
    FOR UPDATE;

    IF FOUND THEN
        CASE earn_event.status
            WHEN 'pending' THEN
                UPDATE dsh_wlt_outbox_events
                SET status='cancelled',reversal_requested=TRUE,
                    last_error='cancelled by confirmed refund before WLT delivery',updated_at=NOW()
                WHERE id=earn_event.id;
                loyalty_actioned:=TRUE;
            WHEN 'processing' THEN
                UPDATE dsh_wlt_outbox_events
                SET reversal_requested=TRUE,
                    last_error='confirmed refund arrived while loyalty event was processing',updated_at=NOW()
                WHERE id=earn_event.id;
                loyalty_actioned:=TRUE;
            WHEN 'sent' THEN
                IF earn_event.external_reference='' THEN
                    RAISE EXCEPTION 'sent loyalty event has no external WLT reference';
                END IF;
                PERFORM dsh_enqueue_loyalty_reversal(p_order_id,COALESCE(p_reason,''));
                loyalty_actioned:=TRUE;
            WHEN 'cancelled' THEN loyalty_actioned:=TRUE;
            ELSE RAISE EXCEPTION 'unsupported loyalty outbox state during refund: %',earn_event.status;
        END CASE;
    END IF;

    INSERT INTO dsh_order_refund_effects
        (order_id,refund_reference,reason,coupon_reversed,loyalty_reversal_queued)
    VALUES (p_order_id,p_refund_reference,COALESCE(p_reason,''),coupon_changed,loyalty_actioned)
    RETURNING * INTO existing_effect;
    RETURN existing_effect;
END;
$$;
