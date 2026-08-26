package workforce

import (
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"testing"
)

func TestFieldProviderShiftAuthorityIsFullyRemoved(t *testing.T) {
	t.Helper()

	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("resolve test source path")
	}
	workforceDir := filepath.Dir(currentFile)

	repositoryBytes, err := os.ReadFile(filepath.Join(workforceDir, "txunit.go"))
	if err != nil {
		t.Fatalf("read governed write source: %v", err)
	}
	repositorySource := string(repositoryBytes)
	createSection := sourceSection(t, repositorySource,
		"func createPersonTx(",
		"func createCaptainTx(",
	)
	updateSection := sourceSection(t, repositorySource,
		"func updatePersonTx(",
		"func updateCaptainTx(",
	)
	for _, forbidden := range []string{"shift_code", "not_applicable", "ShiftCode"} {
		if strings.Contains(createSection, forbidden) {
			t.Fatalf("CreatePerson must not retain field shift compatibility residue %q", forbidden)
		}
		if strings.Contains(updateSection, forbidden) {
			t.Fatalf("UpdatePerson must not retain field shift compatibility residue %q", forbidden)
		}
	}

	modelBytes, err := os.ReadFile(filepath.Join(workforceDir, "model.go"))
	if err != nil {
		t.Fatalf("read model source: %v", err)
	}
	modelSource := string(modelBytes)
	fieldProfileSection := sourceSection(t, modelSource,
		"type FieldProfile struct {",
		"type CaptainProfile struct {",
	)
	createInputSection := sourceSection(t, modelSource,
		"type CreateFieldAgentInput struct {",
		"type CreateCaptainInput struct {",
	)
	updateInputSection := sourceSection(t, modelSource,
		"type UpdateFieldAgentInput struct {",
		"type UpdateCaptainInput struct {",
	)
	for name, section := range map[string]string{
		"FieldProfile":          fieldProfileSection,
		"CreateFieldAgentInput": createInputSection,
		"UpdateFieldAgentInput": updateInputSection,
	} {
		if strings.Contains(section, "ShiftCode") {
			t.Fatalf("%s must not expose or retain field shift authority", name)
		}
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
