package administration

import (
	"slices"
	"strings"
	"testing"
)

func TestRequestStaffRoleAssignmentRejectsInvalidInput(t *testing.T) {
	cases := []struct {
		target string
		role   string
		maker  string
		reason string
	}{
		{target: "", role: "role-1", maker: "maker-1", reason: "valid reason"},
		{target: "actor-1", role: "", maker: "maker-1", reason: "valid reason"},
		{target: "actor-1", role: "role-1", maker: "", reason: "valid reason"},
		{target: "actor-1", role: "role-1", maker: "maker-1", reason: "bad"},
	}
	for _, tc := range cases {
		_, err := RequestStaffRoleAssignment(nil, nil, tc.target, tc.role, tc.maker, tc.reason)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for %+v, got %v", tc, err)
		}
	}
}

func TestRequestStaffRoleAssignmentRejectsSelfAssignment(t *testing.T) {
	_, err := RequestStaffRoleAssignment(nil, nil, "actor-1", "role-1", "actor-1", "valid reason")
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid without database, got %v", err)
	}
}

func TestReviewStaffRoleAssignmentRejectsInvalidDecision(t *testing.T) {
	_, _, err := ReviewStaffRoleAssignment(nil, nil, "approval-1", "checker-1", "unknown", "note", 1)
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for unknown decision, got %v", err)
	}
}

func TestReviewStaffRoleAssignmentRequiresVersion(t *testing.T) {
	_, _, err := ReviewStaffRoleAssignment(nil, nil, "approval-1", "checker-1", "approved", "", 0)
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing expected version, got %v", err)
	}
}

func TestRejectedRoleAssignmentRequiresReviewNote(t *testing.T) {
	_, _, err := ReviewStaffRoleAssignment(nil, nil, "approval-1", "checker-1", "rejected", "bad", 1)
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for short rejection note, got %v", err)
	}
}

func TestNormalizeRoleDefinitionRequiresControlPanelAndNormalizesScope(t *testing.T) {
	name, permissions, surfaces, err := normalizeRoleDefinition(
		" Support-Supervisor ",
		[]string{"administration.audit.read", "administration.read", "administration.audit.read"},
		[]string{"app-field", "control-panel", "app-field"},
	)
	if err != nil {
		t.Fatal(err)
	}
	if name != "support-supervisor" {
		t.Fatalf("unexpected normalized name %q", name)
	}
	if !slices.Equal(permissions, []string{"administration.audit.read", "administration.read"}) {
		t.Fatalf("unexpected permissions %#v", permissions)
	}
	if !slices.Equal(surfaces, []string{"app-field", "control-panel"}) {
		t.Fatalf("unexpected surfaces %#v", surfaces)
	}
	_, _, _, err = normalizeRoleDefinition(
		"support-supervisor",
		[]string{"administration.read"},
		[]string{"app-field"},
	)
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid without control-panel surface, got %v", err)
	}
}

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

func TestInverseRoleAction(t *testing.T) {
	inverse, err := inverseRoleAction(RoleChangeAssign)
	if err != nil || inverse != RoleChangeRevoke {
		t.Fatalf("assignment inverse mismatch: %q %v", inverse, err)
	}
	inverse, err = inverseRoleAction(RoleChangeRevoke)
	if err != nil || inverse != RoleChangeAssign {
		t.Fatalf("revocation inverse mismatch: %q %v", inverse, err)
	}
	if _, err = inverseRoleAction("unknown"); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for unknown action, got %v", err)
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
