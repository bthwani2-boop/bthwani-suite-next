-- DSH-065: commercial-program governance guards
--
-- Defense in depth for the marketing API. Commercial definitions may be
-- authored in DSH, but an active program must have an independent approver.
-- Subscription plans must also carry a WLT product reference before they can
-- become active. Active commercial terms are immutable; pause first, edit,
-- then obtain a fresh independent activation decision.

CREATE OR REPLACE FUNCTION dsh_guard_loyalty_tier_governance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent loyalty-tier approval is required'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.name_ar,
            OLD.name_en,
            OLD.min_points,
            OLD.discount_percent,
            OLD.free_delivery_threshold_yer,
            OLD.badge
       ) IS DISTINCT FROM ROW(
            NEW.name_ar,
            NEW.name_en,
            NEW.min_points,
            NEW.discount_percent,
            NEW.free_delivery_threshold_yer,
            NEW.badge
       ) THEN
        RAISE EXCEPTION 'active loyalty-tier terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_loyalty_tier_governance ON dsh_loyalty_tiers;
CREATE TRIGGER trg_dsh_guard_loyalty_tier_governance
BEFORE UPDATE ON dsh_loyalty_tiers
FOR EACH ROW
EXECUTE FUNCTION dsh_guard_loyalty_tier_governance();

CREATE OR REPLACE FUNCTION dsh_guard_subscription_plan_governance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status <> 'active' THEN
        IF COALESCE(NEW.approved_by_actor_id, '') = ''
           OR NEW.approved_by_actor_id = NEW.created_by_actor_id THEN
            RAISE EXCEPTION 'independent subscription-plan approval is required'
                USING ERRCODE = '23514';
        END IF;
        IF btrim(COALESCE(NEW.wlt_product_reference, '')) = '' THEN
            RAISE EXCEPTION 'WLT product reference is required before subscription activation'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active'
       AND ROW(
            OLD.name_ar,
            OLD.name_en,
            OLD.price_yer,
            OLD.billing_cycle,
            OLD.include_free_delivery,
            OLD.points_multiplier,
            OLD.order_cap,
            OLD.badge,
            OLD.wlt_product_reference
       ) IS DISTINCT FROM ROW(
            NEW.name_ar,
            NEW.name_en,
            NEW.price_yer,
            NEW.billing_cycle,
            NEW.include_free_delivery,
            NEW.points_multiplier,
            NEW.order_cap,
            NEW.badge,
            NEW.wlt_product_reference
       ) THEN
        RAISE EXCEPTION 'active subscription-plan terms are immutable; pause before editing'
            USING ERRCODE = '23514';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsh_guard_subscription_plan_governance ON dsh_subscription_plans;
CREATE TRIGGER trg_dsh_guard_subscription_plan_governance
BEFORE UPDATE ON dsh_subscription_plans
FOR EACH ROW
EXECUTE FUNCTION dsh_guard_subscription_plan_governance();
