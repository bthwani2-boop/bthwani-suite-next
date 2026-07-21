package marketing

import (
	"database/sql"
	"errors"
)

// GetClientBenefitsCatalog returns only DSH-owned marketing definitions and
// published offers. Loyalty balances and paid subscription truth are excluded
// and must be supplied by WLT at the HTTP boundary.
func GetClientBenefitsCatalog(db *sql.DB) (ClientBenefits, error) {
	tiers, err := ListLoyaltyTiers(db, true)
	if err != nil {
		return ClientBenefits{}, err
	}
	plans, err := ListSubscriptionPlans(db, true)
	if err != nil {
		return ClientBenefits{}, err
	}
	offers, err := ListPublishedPartnerOffers(db)
	if err != nil {
		return ClientBenefits{}, err
	}
	return ClientBenefits{
		AvailableTiers: tiers,
		AvailablePlans: plans,
		Offers:         offers,
	}, nil
}

func GetSubscriptionPlanByWLTReference(db *sql.DB, reference string) (SubscriptionPlan, error) {
	plan, err := scanSubscriptionPlan(db.QueryRow(`SELECT `+subscriptionPlanSelectCols+`
		FROM dsh_subscription_plans p
		WHERE p.wlt_product_reference=$1
		  AND p.status='active'
		  AND p.archived_at IS NULL
		ORDER BY p.updated_at DESC
		LIMIT 1`, reference))
	if errors.Is(err, sql.ErrNoRows) {
		return SubscriptionPlan{}, ErrNotFound
	}
	return plan, err
}

func ActiveLoyaltyTierCount(tiers []LoyaltyTier) int64 {
	var count int64
	for _, tier := range tiers {
		if tier.Status == "active" {
			count++
		}
	}
	return count
}

func ActiveSubscriptionPlanCount(plans []SubscriptionPlan) int64 {
	var count int64
	for _, plan := range plans {
		if plan.Status == "active" {
			count++
		}
	}
	return count
}
