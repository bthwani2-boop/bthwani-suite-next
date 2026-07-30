package identity

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
)

// Guards against reintroducing a silent default-OperatorContext fallback like the one
// removed from Repository.RequestOtp (VC-005): every actor-provisioning
// write must derive operator_context_id from a trusted, explicit source, never a
// hardcoded literal.
func TestNoHardcodedLocalDshOperatorContextLiteral(t *testing.T) {
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
			t.Fatalf("%s contains a hardcoded 'local-dsh' OperatorContext literal; operator_context_id must come from a trusted source", file)
		}
	}
}
