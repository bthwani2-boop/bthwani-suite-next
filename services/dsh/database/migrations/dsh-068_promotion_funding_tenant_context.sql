-- DSH-068: preserve tenant context for durable WLT promotion-funding transitions.

ALTER TABLE dsh_coupon_redemptions
    ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';

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

    IF NOT FOUND OR redemption.wlt_funding_reservation_id='' OR redemption.tenant_id='' THEN
        RETURN;
    END IF;

    INSERT INTO dsh_wlt_outbox_events
        (event_type,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,tenant_id,payload)
    VALUES (
        p_event_type,p_order_id,'',COALESCE(redemption.partner_id,''),
        redemption.checkout_intent_id,redemption.client_id,redemption.tenant_id,
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
