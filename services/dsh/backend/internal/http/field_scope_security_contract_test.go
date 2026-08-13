package http

import (
	"os"
	"strings"
	"testing"
)

// Keep the field partner/store boundary tied to operator-context-scoped
// readers. This guards the root authorization invariant against a future
// refactor that accidentally reintroduces global-ID lookups in this path.
func TestFieldPartnerStoreBoundaryUsesOperatorContextScopedReaders(t *testing.T) {
	source, err := os.ReadFile("catalog.go")
	if err != nil {
		t.Fatalf("read field partner/store boundary source: %v", err)
	}
	text := string(source)
	start := strings.Index(text, "func (s *protectedStoreServer) fieldPartnerStore")
	if start < 0 {
		t.Fatal("fieldPartnerStore boundary is missing")
	}
	end := strings.Index(text[start:], "\n}\n\n// GET /dsh/field/partners/")
	if end < 0 {
		t.Fatal("fieldPartnerStore boundary end is missing")
	}
	body := text[start : start+end]
	for _, required := range []string{
		"partner.GetPartnerForOperatorContext",
		"store.GetStoreByPartnerIDForOperatorContext",
	} {
		if !strings.Contains(body, required) {
			t.Fatalf("fieldPartnerStore must use %s", required)
		}
	}
	for _, forbidden := range []string{
		"partner.GetPartner(s.db, partnerID)",
		"store.GetStoreByPartnerID(s.db, partnerID)",
	} {
		if strings.Contains(body, forbidden) {
			t.Fatalf("fieldPartnerStore must not use unscoped reader %s", forbidden)
		}
	}
}

func TestFieldMediaUploadUsesOperatorContextScopedPartnerReader(t *testing.T) {
	source, err := os.ReadFile("media_upload.go")
	if err != nil {
		t.Fatalf("read field media upload source: %v", err)
	}
	text := string(source)
	if !strings.Contains(text, "partner.GetPartnerForOperatorContext") {
		t.Fatal("field media upload must use the operator-context-scoped partner reader")
	}
	if strings.Contains(text, "partner.GetPartner(s.db, partnerID)") {
		t.Fatal("field media upload must not use the unscoped partner reader")
	}
}
