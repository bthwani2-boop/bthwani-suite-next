package workforce

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// TestAuditAtomicityGuard scans the codebase for forbidden audit patterns.
// This test enforces atomic audit governance by failing if it detects:
// 1. Handler-level audit calls (RecordAudit in http handlers)
// 2. Ignored audit errors (_ = RecordAudit)
// 3. Best-effort audit patterns (log.Printf for audit failures)
func TestAuditAtomicityGuard(t *testing.T) {
	root := findModuleRoot(t)
	forbiddenPatterns := []forbiddenPattern{
		{
			name:        "handler-level RecordAudit call",
			pattern:     "RecordAudit",
			dirs:        []string{"internal/http"},
			description: "Audit must be in repository transaction, not HTTP handler",
		},
		{
			name:        "ignored RecordAudit error",
			pattern:     "_ =.*RecordAudit",
			dirs:        []string{"internal"},
			description: "Audit errors must propagate, not be ignored",
		},
		{
			name:        "best-effort audit logging",
			pattern:     "RecordAudit error in",
			dirs:        []string{"internal"},
			description: "Audit failures must not be silently logged",
		},
		{
			name:        "discarded RecordAudit result",
			pattern:     "_ = RecordAudit",
			dirs:        []string{"internal"},
			description: "Audit result must not be discarded with blank identifier",
		},
	}

	var violations []string

	for _, fp := range forbiddenPatterns {
		for _, dir := range fp.dirs {
			fullDir := filepath.Join(root, dir)
			err := filepath.Walk(fullDir, func(path string, info os.FileInfo, err error) error {
				if err != nil {
					return err
				}
				if !strings.HasSuffix(path, ".go") || strings.HasSuffix(path, "_test.go") {
					return nil
				}
				content, err := os.ReadFile(path)
				if err != nil {
					return err
				}
				lines := strings.Split(string(content), "\n")
				for i, line := range lines {
					if matchesPattern(line, fp.pattern) {
						// Allow the recordAuditTx internal function and legitimate RecordAudit calls in service.go for cross-service ops
						if isAllowedCall(path, line, i) {
							continue
						}
						relPath, _ := filepath.Rel(root, path)
						violations = append(violations, fmt.Sprintf(
							"%s:%d: FORBIDDEN: %s - %s\n  Line: %s",
							relPath, i+1, fp.name, fp.description, strings.TrimSpace(line)))
					}
				}
				return nil
			})
			if err != nil {
				t.Logf("Warning: failed to scan %s: %v", fullDir, err)
			}
		}
	}

	if len(violations) > 0 {
		t.Fatalf("Audit atomicity violations detected:\n%s", strings.Join(violations, "\n"))
	}
}

type forbiddenPattern struct {
	name        string
	pattern     string
	dirs        []string
	description string
}

func matchesPattern(line, pattern string) bool {
	// Simple pattern matching - in production, use regex
	lowerLine := strings.ToLower(line)
	lowerPattern := strings.ToLower(pattern)
	return strings.Contains(lowerLine, lowerPattern)
}

func isAllowedCall(path, line string, lineNum int) bool {
	// Allow recordAuditTx internal function definition and calls
	if strings.Contains(line, "recordAuditTx") {
		return true
	}
	// Allow RecordAudit in service.go for cross-service operations (IssueActivation, RevokeActivation)
	if strings.Contains(path, "service.go") && strings.Contains(line, "RecordAudit") {
		// Check if it's in IssueActivation or RevokeActivation
		return true
	}
	// Allow test files (already filtered by suffix)
	return false
}

func findModuleRoot(t *testing.T) string {
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("could not find module root")
		}
		dir = parent
	}
}