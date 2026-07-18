-- DSH-065: commercial-effect reversal after WLT confirms a refund

CREATE TABLE IF NOT EXISTS dsh_order_refund_effects (
    order_id                 UUID PRIMARY KEY REFERENCES dsh_orders(id) ON DELETE RESTRICT,
    refund_reference         TEXT NOT NULL UNIQUE,
    status                   TEXT NOT NULL DEFAULT 'completed'
                             CHECK (status IN ('completed')),
    reason                   TEXT NOT NULL DEFAULT '',
    coupon_reversed          BOOLEAN NOT NULL DEFAULT FALSE,
    loyalty_reversal_queued  BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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
    loyalty_queued BOOLEAN := FALSE;
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
    SET status='reversed',reversed_at=NOW(),release_reason=p_reason,updated_at=NOW()
    WHERE order_id=p_order_id AND status='committed';
    coupon_changed := FOUND;

    IF EXISTS (
        SELECT 1 FROM dsh_wlt_outbox_events
        WHERE order_id=p_order_id AND event_type='loyalty_earned'
          AND status='sent' AND external_reference<>''
    ) THEN
        PERFORM dsh_enqueue_loyalty_reversal(p_order_id,p_reason);
        loyalty_queued := TRUE;
    END IF;

    INSERT INTO dsh_order_refund_effects
        (order_id,refund_reference,reason,coupon_reversed,loyalty_reversal_queued)
    VALUES (p_order_id,p_refund_reference,COALESCE(p_reason,''),coupon_changed,loyalty_queued)
    RETURNING * INTO existing_effect;
    RETURN existing_effect;
END;
$$;

COMMENT ON FUNCTION dsh_apply_confirmed_refund_effects(UUID,TEXT,TEXT) IS
    'Applies coupon and loyalty reversal exactly once after WLT confirms refund completion.';
