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

func TestReplacePartnerStorePermissionsRevokesPreviousBundle(t *testing.T) {
	current := []Permission{
		{Service: "dsh", Surface: "app-partner", Action: "team.manage", Scope: "store:store-1"},
		{Service: "dsh", Surface: "app-partner", Action: "catalog.manage", Scope: "store:store-1"},
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-2"},
		{Service: "wlt", Surface: "app-partner", Action: "balance.read", Scope: "own"},
	}
	staff := []Permission{
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-1"},
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-1"},
	}
	effective := replacePartnerStorePermissions(current, staff, "store-1")
	if len(effective) != 3 {
		t.Fatalf("expected unrelated authorities plus one staff permission, got %#v", effective)
	}
	for _, permission := range effective {
		if permission.Scope == "store:store-1" && permission.Action != "orders.manage" {
			t.Fatalf("downgraded store retained elevated action: %#v", permission)
		}
	}
}

func TestProvisionPartnerActorRejectsInvalidInputBeforeDatabase(t *testing.T) {
	repository := &Repository{}
	_, err := repository.ProvisionPartnerActor(t.Context(), PartnerActorProvisionInput{
		Username:          "partner-user",
		PhoneE164:         "+967771111111",
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

func TestReplacePartnerStorePermissionsCanRevokeOneStoreOnly(t *testing.T) {
	current := []Permission{
		{Service: "dsh", Surface: "app-partner", Action: "team.manage", Scope: "store:store-1"},
		{Service: "dsh", Surface: "app-partner", Action: "orders.manage", Scope: "store:store-2"},
		{Service: "wlt", Surface: "app-partner", Action: "balance.read", Scope: "own"},
	}
	effective := replacePartnerStorePermissions(current, nil, "store-1")
	if len(effective) != 2 {
		t.Fatalf("expected only target store permissions revoked, got %#v", effective)
	}
	for _, permission := range effective {
		if permission.Scope == "store:store-1" {
			t.Fatalf("revoked store authority survived: %#v", permission)
		}
	}
}

func TestSetPartnerStoreAccessRejectsEnabledUnknownBundleBeforeDatabase(t *testing.T) {
	repository := &Repository{}
	_, err := repository.SetPartnerStoreAccess(t.Context(), "partner-1", PartnerStoreAccessInput{
		StoreID: "store-1", PermissionBundle: "administrator", Enabled: true, OperatorContextID: "operator-main",
	})
	if err != ErrInvalidActivation {
		t.Fatalf("expected invalid bundle rejection, got %v", err)
	}
}

func TestSetPartnerStoreAccessAllowsRevocationWithoutBundleValidation(t *testing.T) {
	repository := &Repository{}
	_, err := repository.SetPartnerStoreAccess(t.Context(), "", PartnerStoreAccessInput{
		StoreID: "store-1", Enabled: false, OperatorContextID: "operator-main",
	})
	if err != ErrInvalidActivation {
		t.Fatalf("expected actor validation before database, got %v", err)
	}
}
