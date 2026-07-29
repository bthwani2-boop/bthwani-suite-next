package identity

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Guards against reintroducing a silent default-tenant fallback like the one
// removed from Repository.RequestOtp (VC-005): every actor-provisioning
// write must derive tenant_id from a trusted, explicit source, never a
// hardcoded literal.
func TestNoHardcodedLocalDshTenantLiteral(t *testing.T) {
	files, err := filepath.Glob("*.go")
	if err != nil {
		t.Fatalf("glob package files: %v", err)
	}
	for _, file := range files {
		if strings.HasSuffix(file, "_test.go") {
			continue
		}
		content, err := os.ReadFile(file)
		if err != nil {
			t.Fatalf("read %s: %v", file, err)
		}
		if strings.Contains(string(content), "'local-dsh'") {
			t.Fatalf("%s contains a hardcoded 'local-dsh' tenant literal; tenant_id must come from a trusted source", file)
		}
	}
}
