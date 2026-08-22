package administration

import (
	"strings"
	"testing"
)

func TestAuditRedactionDropsSensitiveValues(t *testing.T) {
	legacy := "approval_id=approval-1; role_id=role-1; reason=phone +967700000000; note=secret token"
	redacted := redactAuditDetail(legacy)
	if !strings.Contains(redacted, "approval_id=approval-1") || !strings.Contains(redacted, "role_id=role-1") {
		t.Fatalf("expected allowlisted keys, got %q", redacted)
	}
	for _, forbidden := range []string{"+967", "secret", "reason=", "note="} {
		if strings.Contains(redacted, forbidden) {
			t.Fatalf("redacted audit leaked %q in %q", forbidden, redacted)
		}
	}

	jsonDetail := `{"role_id":"role-2","phone":"+967711111111","note":"credential"}`
	redacted = redactAuditDetail(jsonDetail)
	if redacted != `{"role_id":"role-2"}` {
		t.Fatalf("unexpected JSON redaction %q", redacted)
	}
}
