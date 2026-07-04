package administration

import "testing"

func TestCreateRoleRequiresName(t *testing.T) {
	_, err := CreateRole(nil, "", "some description")
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for empty role name, got %v", err)
	}
}

func TestAssignStaffRoleRequiresActorAndRole(t *testing.T) {
	cases := [][2]string{
		{"", "role-1"},
		{"actor-1", ""},
	}
	for _, c := range cases {
		_, err := AssignStaffRole(nil, c[0], c[1], "assigner-1")
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for actorID=%q roleID=%q, got %v", c[0], c[1], err)
		}
	}
}

func TestUpsertCaptainCredentialRequiresCaptainID(t *testing.T) {
	_, err := UpsertCaptainCredential(nil, "", "LIC-1", "motorcycle", "", "reviewer-1")
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for empty captainID, got %v", err)
	}
}

func TestValidActivationTransitionsHaveNoSelfLoops(t *testing.T) {
	for from, targets := range validActivationTransitions {
		for _, to := range targets {
			if from == to {
				t.Fatalf("activation status %q must not transition to itself", from)
			}
		}
	}
}

func TestValidActivationTransitionsOnlyReferenceKnownStatuses(t *testing.T) {
	known := map[string]bool{
		"submitted":       true,
		"ops_approved":    true,
		"partner_active":  true,
		"blocked":         true,
	}
	for from, targets := range validActivationTransitions {
		if !known[from] {
			t.Fatalf("unexpected source status %q in validActivationTransitions", from)
		}
		for _, to := range targets {
			if !known[to] {
				t.Fatalf("unexpected target status %q for source %q", to, from)
			}
		}
	}
}

func TestBlockedCanOnlyReturnToSubmitted(t *testing.T) {
	targets := validActivationTransitions["blocked"]
	if len(targets) != 1 || targets[0] != "submitted" {
		t.Fatalf("expected blocked to only transition to submitted, got %v", targets)
	}
}
