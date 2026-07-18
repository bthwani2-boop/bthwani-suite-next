-- DSH-066: close the race between a confirmed refund and a leased loyalty earn event.
--
-- pending earn: cancel before it reaches WLT.
-- processing earn: mark reversal_requested; if WLT accepts the earn, the worker
-- atomically records the external entry reference and enqueues its reversal.
-- failed processing with reversal requested: cancel because WLT did not accept it.

ALTER TABLE dsh_wlt_outbox_events
    DROP CONSTRAINT IF EXISTS dsh_wlt_outbox_events_status_check;
ALTER TABLE dsh_wlt_outbox_events
    ADD CONSTRAINT dsh_wlt_outbox_events_status_check
    CHECK (status IN ('pending','processing','sent','cancelled','failed'));

ALTER TABLE dsh_wlt_outbox_events
    ADD COLUMN IF NOT EXISTS reversal_requested BOOLEAN NOT NULL DEFAULT FALSE;

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
    WHERE order_id=p_order_id AND status='committed';
    coupon_changed := FOUND;

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
                loyalty_actioned := TRUE;
            WHEN 'processing' THEN
                UPDATE dsh_wlt_outbox_events
                SET reversal_requested=TRUE,
                    last_error='confirmed refund arrived while loyalty event was processing',updated_at=NOW()
                WHERE id=earn_event.id;
                loyalty_actioned := TRUE;
            WHEN 'sent' THEN
                IF earn_event.external_reference='' THEN
                    RAISE EXCEPTION 'sent loyalty event has no external WLT reference';
                END IF;
                PERFORM dsh_enqueue_loyalty_reversal(p_order_id,COALESCE(p_reason,''));
                loyalty_actioned := TRUE;
            WHEN 'cancelled' THEN
                loyalty_actioned := TRUE;
            ELSE
                RAISE EXCEPTION 'unsupported loyalty outbox state during refund: %',earn_event.status;
        END CASE;
    END IF;

    INSERT INTO dsh_order_refund_effects
        (order_id,refund_reference,reason,coupon_reversed,loyalty_reversal_queued)
    VALUES (p_order_id,p_refund_reference,COALESCE(p_reason,''),coupon_changed,loyalty_actioned)
    RETURNING * INTO existing_effect;
    RETURN existing_effect;
END;
$$;

COMMENT ON COLUMN dsh_wlt_outbox_events.reversal_requested IS
    'A confirmed refund arrived while a loyalty earn was leased; the worker must enqueue a reversal if WLT accepted the earn.';
