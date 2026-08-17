package partner

import "testing"

func actionSet(actions []string) map[string]bool {
	result := make(map[string]bool, len(actions))
	for _, action := range actions {
		result[action] = true
	}
	return result
}

func TestStoreCreationAuthorityIsSurfaceAndStateBound(t *testing.T) {
	t.Parallel()

	field := actionSet(AllowedActionsForSurface(StatusDraft, "app-field"))
	if !field["update_first_store"] {
		t.Fatal("field onboarding must retain first-store update authority")
	}
	if field["create_store"] {
		t.Fatal("field surface must not gain generic branch creation authority")
	}

	partner := actionSet(AllowedActionsForSurface(StatusPartnerActive, "app-partner"))
	if partner["create_store"] {
		t.Fatal("app-partner must manage authorized stores, not create ownership")
	}

	operatorDraft := actionSet(AllowedActionsForSurface(StatusDraft, "control-panel"))
	if !operatorDraft["create_store"] {
		t.Fatal("control-panel must be able to create an unpublished branch for an eligible partner")
	}

	for _, status := range []ActivationStatus{
		StatusOpsRejected,
		StatusPartnerTerminated,
		StatusPartnerSuspended,
		StatusPartnerTerminated,
	} {
		if actionSet(AllowedActionsForSurface(status, "control-panel"))["create_store"] {
			t.Fatalf("control-panel must not create a store for partner state %q", status)
		}
	}
}
