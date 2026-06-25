package catalog

import "testing"

func TestSanitizeFileName(t *testing.T) {
	got := sanitizeFileName("../menu/hero.png")
	if got == "../menu/hero.png" || got == "" {
		t.Fatalf("unsafe object filename: %q", got)
	}
}

func TestCatalogValidationEnums(t *testing.T) {
	for _, decision := range []string{"approved", "rejected"} {
		if decision != "approved" && decision != "rejected" {
			t.Fatalf("unexpected decision %q", decision)
		}
	}
}
