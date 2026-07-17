package marketing

import (
	"database/sql"
	"strings"
)

// CreateSubscriptionPlanSafe inserts the plan first, then selects it through
// the canonical p alias used by subscriptionPlanSelectCols. PostgreSQL does
// not expose an implicit p alias inside INSERT ... RETURNING.
func CreateSubscriptionPlanSafe(db *sql.DB, in CreateSubscriptionPlanInput) (SubscriptionPlan, error) {
	if err := validatePlan(in.NameAr, in.PriceYer, in.BillingCycle, in.PointsMultiplier, in.OrderCap); err != nil {
		return SubscriptionPlan{}, err
	}
	if strings.TrimSpace(in.NameEn) == "" {
		in.NameEn = in.NameAr
	}

	plan, err := scanSubscriptionPlan(db.QueryRow(`
		WITH inserted AS (
			INSERT INTO dsh_subscription_plans
				(name_ar,name_en,price_yer,billing_cycle,include_free_delivery,points_multiplier,order_cap,badge,wlt_product_reference,created_by_actor_id)
			VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
			RETURNING id
		)
		SELECT `+subscriptionPlanSelectCols+`
		FROM dsh_subscription_plans p
		JOIN inserted i ON i.id = p.id`,
		strings.TrimSpace(in.NameAr), strings.TrimSpace(in.NameEn), in.PriceYer,
		in.BillingCycle, in.IncludeFreeDelivery, in.PointsMultiplier, in.OrderCap,
		strings.TrimSpace(in.Badge), strings.TrimSpace(in.WLTProductReference), in.ActorID))
	if err != nil {
		return SubscriptionPlan{}, err
	}
	_ = WriteAuditEvent(db, "subscription_plan", plan.ID, in.ActorID, "operator", "create", "", in.CorrelationID, nil, commercialJSON(plan))
	return plan, nil
}
