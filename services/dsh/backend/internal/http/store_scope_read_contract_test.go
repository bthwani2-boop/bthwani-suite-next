package http

import (
	"os"
	"strings"
	"testing"
)

func TestOperatorStoreReadBoundariesUseOperatorContextScopedReaders(t *testing.T) {
	protected, err := os.ReadFile("protected_store.go")
	if err != nil {
		t.Fatal(err)
	}
	diagnostics, err := os.ReadFile("store_publication_diagnostics.go")
	if err != nil {
		t.Fatal(err)
	}
	for name, source := range map[string]string{
		"partner settings":        string(protected),
		"publication diagnostics": string(diagnostics),
	} {
		if strings.Contains(source, "store.GetStoreByIDInternal(r.Context(), s.db,") {
			t.Fatalf("%s must not use an unscoped store reader", name)
		}
	}
}
