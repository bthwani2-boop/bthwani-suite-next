-- DSH-087: propagate tenant context through loyalty earn and reversal events.
--
-- dsh-085 made tenant_id mandatory for every durable DSH -> WLT event. The
-- legacy loyalty trigger and reversal function predated that invariant. This
-- forward-only migration replaces both functions and keeps applied history
-- immutable.

BEGIN;

CREATE OR REPLACE FUNCTION dsh_enqueue_loyalty_earned_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    policy RECORD;
    eligible_minor_units BIGINT;
    calculated_points BIGINT;
    event_tenant_id TEXT;
    event_partner_id TEXT;
BEGIN
    IF NEW.status='delivered' AND OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT points_numerator,eligible_minor_units_denominator,minimum_points,
               maximum_points_per_order
        INTO policy
        FROM dsh_loyalty_earning_policies
        WHERE status='active' AND approved_at IS NOT NULL
        ORDER BY updated_at DESC
        LIMIT 1;

        IF FOUND THEN
            eligible_minor_units := GREATEST(NEW.subtotal_minor_units-NEW.discount_minor_units,0);
            calculated_points := FLOOR(
                eligible_minor_units::NUMERIC * policy.points_numerator::NUMERIC /
                policy.eligible_minor_units_denominator::NUMERIC
            );
            IF calculated_points < policy.minimum_points THEN
                calculated_points := policy.minimum_points;
            END IF;
            IF policy.maximum_points_per_order > 0 AND calculated_points > policy.maximum_points_per_order THEN
                calculated_points := policy.maximum_points_per_order;
            END IF;

            IF calculated_points > 0 THEN
                SELECT ci.tenant_id, COALESCE(s.partner_id,'')
                INTO event_tenant_id, event_partner_id
                FROM dsh_checkout_intents ci
                JOIN dsh_stores s ON s.id=NEW.store_id
                WHERE ci.id=NEW.checkout_intent_id
                FOR SHARE OF ci, s;

                IF NOT FOUND OR event_tenant_id IS NULL OR btrim(event_tenant_id)='' THEN
                    RAISE EXCEPTION 'cannot enqueue loyalty earn without checkout tenant context';
                END IF;

                INSERT INTO dsh_wlt_outbox_events
                    (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id,
                     client_id,points,payload)
                VALUES (
                    'loyalty_earned',event_tenant_id,NEW.id,'',event_partner_id,
                    NEW.checkout_intent_id,NEW.client_id,calculated_points,
                    jsonb_build_object(
                        'eligibleMinorUnits',eligible_minor_units,
                        'subtotalMinorUnits',NEW.subtotal_minor_units,
                        'discountMinorUnits',NEW.discount_minor_units,
                        'currency',NEW.currency,
                        'pricingSnapshotHash',NEW.pricing_snapshot_hash
                    )
                )
                ON CONFLICT (order_id,event_type) DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION dsh_enqueue_loyalty_reversal(
    p_order_id UUID,
    p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    original_event RECORD;
BEGIN
    SELECT * INTO original_event
    FROM dsh_wlt_outbox_events
    WHERE order_id=p_order_id AND event_type='loyalty_earned'
    FOR UPDATE;

    IF NOT FOUND OR original_event.points<=0 THEN
        RETURN;
    END IF;
    IF original_event.status<>'sent' OR original_event.external_reference='' THEN
        RAISE EXCEPTION 'loyalty earn event is not confirmed by WLT';
    END IF;
    IF original_event.tenant_id IS NULL OR btrim(original_event.tenant_id)='' THEN
        RAISE EXCEPTION 'loyalty earn event has no tenant context';
    END IF;

    INSERT INTO dsh_wlt_outbox_events
        (event_type,tenant_id,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,points,reversal_of_reference,payload)
    VALUES (
        'loyalty_reversed',original_event.tenant_id,original_event.order_id,'',
        original_event.partner_id,original_event.checkout_intent_id,
        original_event.client_id,original_event.points,original_event.external_reference,
        jsonb_build_object('reason',p_reason)
    )
    ON CONFLICT (order_id,event_type) DO NOTHING;
END;
$$;

COMMENT ON FUNCTION dsh_enqueue_loyalty_earned_on_delivery() IS
    'Atomically enqueues tenant-scoped loyalty earn truth when an order is delivered.';
COMMENT ON FUNCTION dsh_enqueue_loyalty_reversal(UUID,TEXT) IS
    'Creates an idempotent tenant-scoped WLT loyalty reversal after governed refund confirmation.';

COMMIT;
