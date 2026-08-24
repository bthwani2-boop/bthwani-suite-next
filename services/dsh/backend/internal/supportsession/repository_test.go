package supportsession

import (
	"strings"
	"testing"
)

func TestSupportAuditDetailStoresOnlyStructuredPresenceSignals(t *testing.T) {
	detail, err := supportAuditDetail("request-1", true, true)
	if err != nil {
		t.Fatalf("supportAuditDetail: %v", err)
	}
	for _, expected := range []string{`"request_id":"request-1"`, `"reason_provided":true`, `"note_provided":true`} {
		if !strings.Contains(detail, expected) {
			t.Fatalf("audit detail %q is missing %s", detail, expected)
		}
	}
	for _, forbidden := range []string{"reason=", "note=", "+967", "token"} {
		if strings.Contains(detail, forbidden) {
			t.Fatalf("audit detail leaked %q: %s", forbidden, detail)
		}
	}
}
