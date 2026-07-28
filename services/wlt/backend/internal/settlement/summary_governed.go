package settlement

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"wlt-api/internal/shared"
)

// ListSettlementSummaryGoverned returns a deterministic aggregate row scoped
// to the authenticated request tenant. Identical partner identifiers may exist
// in different tenants without sharing financial totals.
func ListSettlementSummaryGoverned(ctx context.Context, db *sql.DB, partnerID, periodStart, periodEnd string) (*SettlementSummary, error) {
	tenantID, err := shared.RequireTenantContext(ctx)
	if err != nil {
		return nil, err
	}
	partnerID = strings.TrimSpace(partnerID)
	if partnerID == "" {
		return nil, fmt.Errorf("partnerId is required")
	}
	const q = `
		SELECT
			$2::text,
			COALESCE(MIN(period_start)::text, ''),
			COALESCE(MAX(period_end)::text, ''),
			COALESCE(SUM(gross_amount), 0),
			COALESCE(SUM(platform_fee), 0),
			COALESCE(SUM(net_amount), 0),
			COALESCE(SUM(order_count), 0),
			COUNT(*),
			COALESCE(MAX(currency), 'YER')
		FROM wlt_settlements
		WHERE tenant_id = $1
		  AND partner_id = $2
		  AND ($3 = '' OR period_start >= $3::date)
		  AND ($4 = '' OR period_end <= $4::date)`

	var summary SettlementSummary
	if err := db.QueryRowContext(ctx, q, tenantID, partnerID, periodStart, periodEnd).Scan(
		&summary.PartnerID,
		&summary.PeriodStart,
		&summary.PeriodEnd,
		&summary.TotalGross,
		&summary.TotalFee,
		&summary.TotalNet,
		&summary.TotalOrders,
		&summary.SettlementCount,
		&summary.Currency,
	); err != nil {
		return nil, err
	}
	return &summary, nil
}

func HandleGetSettlementSummaryGoverned(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		query := r.URL.Query()
		summary, err := ListSettlementSummaryGoverned(
			r.Context(),
			db,
			query.Get("partnerId"),
			query.Get("periodStart"),
			query.Get("periodEnd"),
		)
		if err != nil {
			shared.SendError(w, http.StatusBadRequest, "INVALID_REQUEST", err.Error())
			return
		}
		shared.SendJSON(w, http.StatusOK, map[string]any{"summary": summary})
	}
}
