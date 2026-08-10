package workforce

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestFieldProviderShiftAuthorityRemainsInternal(t *testing.T) {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test source path")
	}
	sourceBytes, err := os.ReadFile(filepath.Join(filepath.Dir(currentFile), "repository.go"))
	if err != nil {
		t.Fatalf("read repository source: %v", err)
	}
	source := string(sourceBytes)

	createSection := sourceSection(t, source,
		"func (r *Repository) CreatePerson(",
		"func (r *Repository) CreateCaptain(",
	)
	if strings.Contains(createSection, "input.ShiftCode") {
		t.Fatal("CreatePerson must not accept external shift authority")
	}
	if !strings.Contains(createSection, "'not_applicable'") {
		t.Fatal("CreatePerson must persist the internal no-shift compatibility value")
	}

	updateSection := sourceSection(t, source,
		"func (r *Repository) UpdatePerson(",
		"func (r *Repository) UpdateCaptain(",
	)
	if strings.Contains(updateSection, "input.ShiftCode") {
		t.Fatal("UpdatePerson must not restore external shift authority")
	}
}

func sourceSection(t *testing.T, source, startMarker, endMarker string) string {
	t.Helper()
	start := strings.Index(source, startMarker)
	if start < 0 {
		t.Fatalf("missing source marker %q", startMarker)
	}
	endRelative := strings.Index(source[start:], endMarker)
	if endRelative < 0 {
		t.Fatalf("missing source marker %q", endMarker)
	}
	return source[start : start+endRelative]
}
