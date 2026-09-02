package analytics

import (
	"database/sql"
	"fmt"
	"time"
)

// GetFreshness returns the actual generated_at from projections for a given metric prefix
func GetFreshness(db *sql.DB, metricPrefix string) (time.Time, error) {
	var freshness time.Time
	err := db.QueryRow(`
		SELECT COALESCE(MAX(generated_at), NOW())
		FROM dsh_analytics_projections
		WHERE metric_id LIKE $1`,
		fmt.Sprintf("%s%%", metricPrefix)).Scan(&freshness)
	return freshness, err
}
