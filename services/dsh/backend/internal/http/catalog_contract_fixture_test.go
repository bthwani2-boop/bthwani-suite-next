package http

import (
	"os"
	"path/filepath"
	"testing"
)

func readCatalogContractFixture(t *testing.T, relativePath string) string {
	t.Helper()
	content, err := os.ReadFile(filepath.Clean(relativePath))
	if err != nil {
		t.Fatalf("read catalog contract fixture %s: %v", relativePath, err)
	}
	return string(content)
}
