package administration

import "testing"

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
	// nil database is rejected before the actor invariant is evaluated.
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
