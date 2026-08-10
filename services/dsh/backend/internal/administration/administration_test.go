package administration

import (
	"slices"
	"strings"
	"testing"
)



func TestAdministrationPermissionCandidatesPreserveLegacyFallback(t *testing.T) {
	cases := map[string][]string{
		"administration.role.request":     {"administration.role.request", "administration.manage"},
		"administration.staff.approve":    {"administration.staff.approve", "administration.approve"},
		"administration.audit.read":       {"administration.audit.read", "administration.read"},
		"administration.diagnostics.read": {"administration.diagnostics.read", "administration.read"},
	}
	for action, expected := range cases {
		actual := AdministrationPermissionCandidates(action)
		if !slices.Equal(actual, expected) {
			t.Fatalf("%s: expected %#v, got %#v", action, expected, actual)
		}
	}
	if actual := AdministrationPermissionCandidates("catalog.read"); actual != nil {
		t.Fatalf("non-administration permission must fail closed, got %#v", actual)
	}
}



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
