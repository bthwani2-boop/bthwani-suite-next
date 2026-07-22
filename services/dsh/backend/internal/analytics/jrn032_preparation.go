package analytics

import (
	"database/sql"
	"strings"
)

type PreparationSLAAnalytics struct {
	TotalMeasured             int      `json:"totalMeasured"`
	WithinSLA                 int      `json:"withinSla"`
	BreachedSLA               int      `json:"breachedSla"`
	OpenPastEstimate          int      `json:"openPastEstimate"`
	AveragePreparationMinutes float64  `json:"averagePreparationMinutes"`
	Metadata                  Metadata `json:"metadata"`
}

func GetPreparationSLAAnalytics(db *sql.DB, window Window, storeID string) (PreparationSLAAnalytics, error) {
	out := PreparationSLAAnalytics{
		Metadata: NewMetadata(window,
			"dsh_orders.accepted_at",
			"dsh_orders.preparation_started_at",
			"dsh_orders.estimated_ready_at",
			"dsh_orders.ready_at",
		),
	}
	storeID = strings.TrimSpace(storeID)
	const query = `
		SELECT
			COUNT(*) FILTER (WHERE ready_at IS NOT NULL),
			COUNT(*) FILTER (WHERE ready_at IS NOT NULL AND ready_at <= estimated_ready_at),
			COUNT(*) FILTER (WHERE ready_at IS NOT NULL AND ready_at > estimated_ready_at),
			COUNT(*) FILTER (WHERE ready_at IS NULL AND estimated_ready_at < NOW() AND status IN ('store_accepted','preparing')),
			COALESCE(AVG(EXTRACT(EPOCH FROM (ready_at - COALESCE(preparation_started_at, accepted_at))) / 60.0)
				FILTER (WHERE ready_at IS NOT NULL), 0)
		FROM dsh_orders
		WHERE accepted_at >= $1 AND accepted_at < $2
		  AND ($3 = '' OR store_id = $3)`
	if err := db.QueryRow(query, window.From, window.To, storeID).Scan(
		&out.TotalMeasured,
		&out.WithinSLA,
		&out.BreachedSLA,
		&out.OpenPastEstimate,
		&out.AveragePreparationMinutes,
	); err != nil {
		return out, err
	}
	return out, nil
}
