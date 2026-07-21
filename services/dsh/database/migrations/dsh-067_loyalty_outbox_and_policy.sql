-- DSH-067: governed loyalty earning and generalized DSH -> WLT outbox
--
-- Delivery completion is a DSH operational fact. WLT owns points balance and
-- ledger truth. A database trigger writes a durable loyalty_earned event in the
-- same transaction that changes an order to delivered. The worker sends it to
-- WLT idempotently and stores the WLT loyalty-entry reference for reversal.

CREATE TABLE IF NOT EXISTS dsh_loyalty_earning_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name_ar TEXT NOT NULL,
    points_numerator BIGINT NOT NULL DEFAULT 1 CHECK (points_numerator > 0),
    eligible_minor_units_denominator BIGINT NOT NULL CHECK (eligible_minor_units_denominator > 0),
    minimum_points BIGINT NOT NULL DEFAULT 0 CHECK (minimum_points >= 0),
    maximum_points_per_order BIGINT NOT NULL DEFAULT 0 CHECK (maximum_points_per_order >= 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','paused','archived')),
    created_by_actor_id TEXT NOT NULL,
    approved_by_actor_id TEXT NOT NULL DEFAULT '',
    approved_at TIMESTAMPTZ,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_dsh_loyalty_active_policy
    ON dsh_loyalty_earning_policies(status)
    WHERE status='active';

INSERT INTO dsh_loyalty_earning_policies
    (name_ar,points_numerator,eligible_minor_units_denominator,minimum_points,
     maximum_points_per_order,status,created_by_actor_id,approved_by_actor_id,approved_at)
SELECT 'السياسة الأساسية: نقطة لكل 100 ريال',1,10000,0,0,'active',
       'migration:dsh-067','migration:dsh-067',NOW()
WHERE NOT EXISTS (SELECT 1 FROM dsh_loyalty_earning_policies WHERE status='active');

ALTER TABLE dsh_wlt_outbox_events
    ALTER COLUMN captain_id DROP NOT NULL,
    ALTER COLUMN partner_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS points BIGINT NOT NULL DEFAULT 0 CHECK (points >= 0),
    ADD COLUMN IF NOT EXISTS reversal_of_reference TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS external_reference TEXT NOT NULL DEFAULT '',
    ADD COLUMN IF NOT EXISTS payload JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION dsh_enqueue_loyalty_earned_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    policy RECORD;
    eligible_minor_units BIGINT;
    calculated_points BIGINT;
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
                INSERT INTO dsh_wlt_outbox_events
                    (event_type,order_id,captain_id,partner_id,checkout_intent_id,
                     client_id,points,payload)
                SELECT 'loyalty_earned',NEW.id,'',COALESCE(s.partner_id,''),
                       NEW.checkout_intent_id,NEW.client_id,calculated_points,
                       jsonb_build_object(
                           'eligibleMinorUnits',eligible_minor_units,
                           'subtotalMinorUnits',NEW.subtotal_minor_units,
                           'discountMinorUnits',NEW.discount_minor_units,
                           'currency',NEW.currency,
                           'pricingSnapshotHash',NEW.pricing_snapshot_hash
                       )
                FROM dsh_stores s WHERE s.id=NEW.store_id
                ON CONFLICT (order_id,event_type) DO NOTHING;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_enqueue_loyalty_earned ON dsh_orders;
CREATE TRIGGER trg_dsh_enqueue_loyalty_earned
AFTER UPDATE OF status ON dsh_orders
FOR EACH ROW
EXECUTE FUNCTION dsh_enqueue_loyalty_earned_on_delivery();

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

    INSERT INTO dsh_wlt_outbox_events
        (event_type,order_id,captain_id,partner_id,checkout_intent_id,
         client_id,points,reversal_of_reference,payload)
    VALUES ('loyalty_reversed',original_event.order_id,'',original_event.partner_id,
            original_event.checkout_intent_id,original_event.client_id,
            original_event.points,original_event.external_reference,
            jsonb_build_object('reason',p_reason))
    ON CONFLICT (order_id,event_type) DO NOTHING;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_dsh_wlt_outbox_loyalty_client
    ON dsh_wlt_outbox_events(client_id,event_type,status)
    WHERE event_type IN ('loyalty_earned','loyalty_reversed');

COMMENT ON FUNCTION dsh_enqueue_loyalty_reversal(UUID,TEXT) IS
    'Called only after a governed refund/cancellation is confirmed; creates an idempotent WLT reversal event.';
