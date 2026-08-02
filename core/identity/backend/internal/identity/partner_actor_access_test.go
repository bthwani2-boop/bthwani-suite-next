package identity

import "testing"

func TestRegisteredPartnerBundleRejectsUnknownCode(t *testing.T) {
	for _, code := range []string{"owner", "manager", "supervisor", "staff", "courier"} {
		if !registeredPartnerBundle(code) {
			t.Fatalf("expected registered partner bundle %q", code)
		}
	}
	if registeredPartnerBundle("administrator") {
		t.Fatal("unknown partner bundle must be rejected")
	}
}

func TestMergePermissionsDeduplicatesExactAuthority(t *testing.T) {
	current := []Permission{
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-1"},
	}
	additions := []Permission{
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-1"},
		{Service: "dsh", Surface: "app-partner", Action: "catalog.manage", Scope: "store:store-1"},
	}
	merged := mergePermissions(current, additions)
	if len(merged) != 2 {
		t.Fatalf("expected two unique permissions, got %#v", merged)
	}
}

func TestProvisionPartnerActorRejectsInvalidInputBeforeDatabase(t *testing.T) {
	repository := &Repository{}
	_, err := repository.ProvisionPartnerActor(t.Context(), PartnerActorProvisionInput{
		Username:          "partner-user",
		PhoneE164:         "+967771000001",
		PermissionBundle:  "unknown",
		StoreID:           "store-1",
		OperatorContextID: "operator-main",
	})
	if err != ErrInvalidActivation {
		t.Fatalf("expected invalid bundle rejection, got %v", err)
	}
}

func TestIssuePartnerActivationRejectsIncompleteInputBeforeDatabase(t *testing.T) {
	repository := &Repository{activationSecret: make([]byte, minimumActivationSecretLength)}
	_, err := repository.IssuePartnerActivationForActor(
		t.Context(),
		"partner-1",
		PartnerActivationInput{IssuedByActorID: "issuer-1", OperatorContextID: "operator-main"},
		"invite-1",
		"correlation-1",
	)
	if err != ErrInvalidActivation {
		t.Fatalf("expected missing store rejection, got %v", err)
	}
}
