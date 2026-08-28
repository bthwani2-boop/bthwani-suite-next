package commercial

import (
	"context"
	"database/sql"
	"net/http"

	"wlt-api/internal/shared"
)

type Summary struct {
	ActiveProducts        int64 `json:"activeProducts"`
	ActiveSubscriptions   int64 `json:"activeSubscriptions"`
	MonthlyRecurringMinor int64 `json:"monthlyRecurringMinorUnits"`
	LoyaltyAccounts       int64 `json:"loyaltyAccounts"`
	PointsIssuedThisMonth int64 `json:"pointsIssuedThisMonth"`
}

func GetSummary(ctx context.Context, db *sql.DB) (*Summary, error) {
	operatorContextID, contextErr := shared.RequireOperatorContext(ctx)
	if contextErr != nil || db == nil {
		return nil, ErrInvalid
	}
	var summary Summary
	err := db.QueryRow(`
		SELECT
			(SELECT COUNT(*) FROM wlt_commercial_products WHERE status='active'),
			(SELECT COUNT(*) FROM wlt_client_subscriptions WHERE operator_context_id=$1 AND status='active'),
			(SELECT COALESCE(SUM(CASE p.billing_cycle
				WHEN 'monthly' THEN p.price_minor_units
				WHEN 'quarterly' THEN p.price_minor_units / 3
				WHEN 'annual' THEN p.price_minor_units / 12
				ELSE 0 END), 0)
			 FROM wlt_client_subscriptions s
			 JOIN wlt_commercial_products p ON p.reference=s.product_reference
			 WHERE s.operator_context_id=$1 AND s.status='active'),
			(SELECT COUNT(*) FROM wlt_loyalty_accounts WHERE operator_context_id=$1),
			(SELECT COALESCE(SUM(CASE
				WHEN e.direction='earn' THEN e.points
				WHEN e.direction='reverse' AND original.direction='earn' THEN -e.points
				ELSE 0 END), 0)
			 FROM wlt_loyalty_entries e
			 LEFT JOIN wlt_loyalty_entries original ON original.id=e.reversal_of
			 WHERE e.operator_context_id=$1 AND e.created_at >= date_trunc('month', NOW()))`, operatorContextID).
		Scan(
			&summary.ActiveProducts,
			&summary.ActiveSubscriptions,
			&summary.MonthlyRecurringMinor,
			&summary.LoyaltyAccounts,
			&summary.PointsIssuedThisMonth,
		)
	if err != nil {
		return nil, err
	}
	return &summary, nil
}

func HandleGetSummary(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		summary, err := GetSummary(r.Context(), db)
		if err != nil {
			writeError(w, err)
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
	}
}
