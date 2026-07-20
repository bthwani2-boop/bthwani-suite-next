package settlement

import (
	"database/sql"
	"fmt"
	"net/http"

	"wlt-api/internal/shared"
)

// ListSettlementSummaryGoverned returns one deterministic aggregate row for the
// requested partner. The partner identifier is sourced from the authenticated
// query argument rather than selected as a non-aggregated table column, so the
// query remains valid without a misleading GROUP BY and also returns a stable
// zero-value summary when no settlements exist.
func ListSettlementSummaryGoverned(db *sql.DB, partnerID, periodStart, periodEnd string) (*SettlementSummary, error) {
	if partnerID == "" {
		return nil, fmt.Errorf("partnerId is required")
	}
	const q = `
		SELECT
			$1::text,
			COALESCE(MIN(period_start)::text, ''),
			COALESCE(MAX(period_end)::text, ''),
			COALESCE(SUM(gross_amount), 0),
			COALESCE(SUM(platform_fee), 0),
			COALESCE(SUM(net_amount), 0),
			COALESCE(SUM(order_count), 0),
			COUNT(*),
			COALESCE(MAX(currency), 'YER')
		FROM wlt_settlements
		WHERE partner_id = $1
		  AND ($2 = '' OR period_start >= $2::date)
		  AND ($3 = '' OR period_end <= $3::date)`

	var summary SettlementSummary
	if err := db.QueryRow(q, partnerID, periodStart, periodEnd).Scan(
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
