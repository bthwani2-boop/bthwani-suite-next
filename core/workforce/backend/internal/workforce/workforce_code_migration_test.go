package workforce

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestWorkforceCodeSequenceReconciliationMigration(t *testing.T) {
	migrationPath := filepath.Join(
		"..", "..", "..", "database", "migrations",
		"workforce-015_workforce_code_sequence_reconciliation.sql",
	)
	sourceBytes, err := os.ReadFile(migrationPath)
	if err != nil {
		t.Fatalf("read Workforce code reconciliation migration: %v", err)
	}
	source := string(sourceBytes)

	for _, marker := range []string{
		"RENAME CONSTRAINT workforce_people_provider_code_key",
		"TO workforce_people_workforce_code_key",
		"workforce_field_code_seq",
		"workforce_captain_code_seq",
		"workforce_employee_code_seq",
		"highest > 0",
	} {
		if !strings.Contains(source, marker) {
			t.Fatalf("Workforce code reconciliation migration is missing %q", marker)
		}
	}
}
