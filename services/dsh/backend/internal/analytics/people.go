package analytics

import "database/sql"

type CaptainPerformanceRow struct {
	CaptainID             string  `json:"captainId"`
	Assignments           int     `json:"assignments"`
	Accepted              int     `json:"accepted"`
	Declined              int     `json:"declined"`
	Completed             int     `json:"completed"`
	AcceptanceRate        float64 `json:"acceptanceRate"`
	CompletionRate        float64 `json:"completionRate"`
	AverageResponseSeconds float64 `json:"averageResponseSeconds"`
}

type CaptainPerformanceAnalytics struct {
	Rows     []CaptainPerformanceRow `json:"rows"`
	Metadata Metadata                `json:"metadata"`
}

func GetCaptainPerformance(db *sql.DB, window Window, limit int) (CaptainPerformanceAnalytics, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	out := CaptainPerformanceAnalytics{
		Rows: []CaptainPerformanceRow{},
		Metadata: NewMetadata(window,
			"dsh_assignments.captain_id",
			"dsh_assignments.status",
			"dsh_assignments.accepted_at",
			"dsh_assignments.completed_at",
		),
	}
	const query = `
		SELECT captain_id,
			COUNT(*) AS assignments,
			COUNT(*) FILTER (WHERE status IN ('accepted','completed')) AS accepted,
			COUNT(*) FILTER (WHERE status = 'declined') AS declined,
			COUNT(*) FILTER (WHERE status = 'completed') AS completed,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND((COUNT(*) FILTER (WHERE status IN ('accepted','completed'))::numeric * 100) / COUNT(*), 2) END,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND((COUNT(*) FILTER (WHERE status = 'completed')::numeric * 100) / COUNT(*), 2) END,
			COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(accepted_at, declined_at) - created_at)))
				FILTER (WHERE accepted_at IS NOT NULL OR declined_at IS NOT NULL), 0)
		FROM dsh_assignments
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY captain_id
		ORDER BY completed DESC, assignments DESC, captain_id
		LIMIT $3`
	rows, err := db.Query(query, window.From, window.To, limit)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var row CaptainPerformanceRow
		if err := rows.Scan(
			&row.CaptainID,
			&row.Assignments,
			&row.Accepted,
			&row.Declined,
			&row.Completed,
			&row.AcceptanceRate,
			&row.CompletionRate,
			&row.AverageResponseSeconds,
		); err != nil {
			return out, err
		}
		out.Rows = append(out.Rows, row)
	}
	return out, rows.Err()
}

type FieldPerformanceRow struct {
	FieldAgentID       string  `json:"fieldAgentId"`
	Visits             int     `json:"visits"`
	Completed          int     `json:"completed"`
	Escalated          int     `json:"escalated"`
	CompletionRate     float64 `json:"completionRate"`
	AverageVisitMinutes float64 `json:"averageVisitMinutes"`
}

type FieldPerformanceAnalytics struct {
	Rows     []FieldPerformanceRow `json:"rows"`
	Metadata Metadata              `json:"metadata"`
}

func GetFieldPerformance(db *sql.DB, window Window, limit int) (FieldPerformanceAnalytics, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	out := FieldPerformanceAnalytics{
		Rows: []FieldPerformanceRow{},
		Metadata: NewMetadata(window,
			"dsh_field_visits.field_agent_id",
			"dsh_field_visits.status",
			"dsh_field_visits.started_at",
			"dsh_field_visits.completed_at",
		),
	}
	const query = `
		SELECT field_agent_id,
			COUNT(*) AS visits,
			COUNT(*) FILTER (WHERE status = 'complete') AS completed,
			COUNT(*) FILTER (WHERE status = 'escalated') AS escalated,
			CASE WHEN COUNT(*) = 0 THEN 0 ELSE ROUND((COUNT(*) FILTER (WHERE status = 'complete')::numeric * 100) / COUNT(*), 2) END,
			COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 60.0)
				FILTER (WHERE completed_at IS NOT NULL), 0)
		FROM dsh_field_visits
		WHERE created_at >= $1 AND created_at < $2
		GROUP BY field_agent_id
		ORDER BY completed DESC, visits DESC, field_agent_id
		LIMIT $3`
	rows, err := db.Query(query, window.From, window.To, limit)
	if err != nil {
		return out, err
	}
	defer rows.Close()
	for rows.Next() {
		var row FieldPerformanceRow
		if err := rows.Scan(
			&row.FieldAgentID,
			&row.Visits,
			&row.Completed,
			&row.Escalated,
			&row.CompletionRate,
			&row.AverageVisitMinutes,
		); err != nil {
			return out, err
		}
		out.Rows = append(out.Rows, row)
	}
	return out, rows.Err()
}
