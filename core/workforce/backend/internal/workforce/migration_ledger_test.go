package workforce

import (
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
)

var workforceMigrationNamePattern = regexp.MustCompile(`^workforce-([0-9]+)_.+\.sql$`)

func TestWorkforceMigrationSequenceIDsAreUnique(t *testing.T) {
	entries, err := os.ReadDir("../../../database/migrations")
	if err != nil {
		t.Fatalf("read workforce migrations: %v", err)
	}
	seen := map[string]string{}
	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		match := workforceMigrationNamePattern.FindStringSubmatch(entry.Name())
		if match == nil {
			continue
		}
		sequence := match[1]
		if previous, exists := seen[sequence]; exists {
			t.Fatalf("duplicate workforce migration sequence %s: %s and %s", sequence, previous, entry.Name())
		}
		seen[sequence] = entry.Name()
	}
	if len(seen) == 0 {
		t.Fatal("no workforce migrations matched the canonical filename pattern")
	}
}

func TestIdentityWorkforceAuthorityBoundaryMigrationExists(t *testing.T) {
	path := filepath.Join("../../../database/migrations", "workforce-012_identity_workforce_authority_boundary.sql")
	content, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("read authority boundary migration: %v", err)
	}
	text := string(content)
	for _, required := range []string{
		"DROP COLUMN IF EXISTS authority_scopes",
		"Identity-owned permission-bundle identifier",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("authority boundary migration is missing %q", required)
		}
	}
}
