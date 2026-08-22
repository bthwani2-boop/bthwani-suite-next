package fieldreadiness

import (
	"database/sql"
	"testing"
)

func policyCheckTypes(t *testing.T, db *sql.DB, visitID string) []string {
	t.Helper()
	rows, err := db.Query(`
		SELECT check_type
		FROM dsh_visit_checklist_requirements
		WHERE visit_id = $1 AND required = TRUE
		ORDER BY display_order`, visitID)
	if err != nil {
		t.Fatalf("list visit checklist policy: %v", err)
	}
	defer rows.Close()
	var result []string
	for rows.Next() {
		var checkType string
		if err := rows.Scan(&checkType); err != nil {
			t.Fatalf("scan visit checklist policy: %v", err)
		}
		result = append(result, checkType)
	}
	if err := rows.Err(); err != nil {
		t.Fatalf("iterate visit checklist policy: %v", err)
	}
	if len(result) == 0 {
		t.Fatal("visit checklist policy is empty")
	}
	return result
}
