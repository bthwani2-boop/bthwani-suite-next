package partner

import "testing"

func containsAction(actions []string, want string) bool {
	for _, action := range actions {
		if action == want {
			return true
		}
	}
	return false
}

func TestPartnerActivationStateMachineRejectsForbiddenJumps(t *testing.T) {
	forbidden := [][2]ActivationStatus{
		{StatusDraft, StatusPartnerActive},
		{StatusDraft, StatusClientVisible},
		{StatusSubmitted, StatusOpsApproved},
		{StatusDocumentsUploaded, StatusPartnerActive},
		{StatusOpsReview, StatusClientVisible},
		{StatusPartnerTerminated, StatusClientVisible},
	}
	for _, pair := range forbidden {
		if IsTransitionAllowed(pair[0], pair[1]) {
			t.Fatalf("forbidden transition was accepted: %s -> %s", pair[0], pair[1])
		}
	}
}

func TestPartnerActivationStateMachineHasNoSelfTransitions(t *testing.T) {
	states := []ActivationStatus{
		StatusDraft, StatusSubmitted, StatusFieldVisitScheduled,
		StatusFieldVisitCompleted, StatusDocumentsMissing,
		StatusDocumentsUploaded, StatusDocumentsVerified,
		StatusCatalogNotReady, StatusCatalogReady,
		StatusDeliveryModesNotReady, StatusDeliveryModesReady,
		StatusOpsReview, StatusOpsApproved, StatusOpsRejected,
		StatusPartnerActive, StatusPartnerTerminated,
		StatusClientVisible, StatusClientHidden,
	}
	for _, state := range states {
		if IsTransitionAllowed(state, state) {
			t.Fatalf("state machine permits a self transition for %s", state)
		}
	}
}

func TestFieldSurfaceCanOnlySubmitOwnedDraft(t *testing.T) {
	invalidTransitions := []struct {
		from ActivationStatus
		to   ActivationStatus
	}{
		{StatusPartnerSuspended, StatusClientVisible},
		{StatusPartnerTerminated, StatusClientVisible},
	}
	for _, tc := range invalidTransitions {
		if len(AllowedTransitionsForSurface(tc.from, "app-field")) > 0 {
			t.Errorf("App-field should not allow %s -> %s", tc.from, tc.to)
		}
	}
}

func TestAllowedActionsForSurface(t *testing.T) {
	// app-field tests
	t.Run("app-field draft", func(t *testing.T) {
		actions := AllowedActionsForSurface(StatusDraft, "app-field")
		expected := []string{"read_owned_draft", "read_readiness", "update_owned_draft", "update_first_store", "upload_document", "capture_field_visit", "submit_for_review"}
		if !containsAll(actions, expected) {
			t.Errorf("Expected %v, got %v", expected, actions)
		}
	})

	t.Run("app-field no direct review", func(t *testing.T) {
		for _, state := range []ActivationStatus{StatusDraft, StatusOpsReview, StatusPartnerActive, StatusClientVisible} {
			actions := AllowedActionsForSurface(state, "app-field")
			for _, prohibited := range []string{"start_ops_review", "approve_partner", "activate_partner", "suspend_partner", "terminate_partner"} {
				if containsString(actions, prohibited) {
					t.Errorf("App-field should not have action %s in state %s", prohibited, state)
				}
			}
		}
	})

	// control-panel tests
	t.Run("control-panel read access", func(t *testing.T) {
		actions := AllowedActionsForSurface(StatusPartnerActive, "control-panel")
		expected := []string{"read_partner", "read_readiness", "read_documents", "read_field_visits", "read_audit"}
		if !containsAll(actions, expected) {
			t.Errorf("Control-panel should always have read access, got %v", actions)
		}
	})

	t.Run("system action", func(t *testing.T) {
		actions := AllowedActionsForSurface(StatusSubmitted, "system")
		expected := []string{"read_partner", "apply_governed_transition"}
		if !containsAll(actions, expected) {
			t.Errorf("System should have read and direct transition, got %v", actions)
		}
	})
}

// containsAll checks if all items in 'subset' exist in 'set'.
func containsAll(set, subset []string) bool {
	for _, s := range subset {
		if !containsString(set, s) {
			return false
		}
	}
	return true
}

func containsString(slice []string, val string) bool {
	for _, s := range slice {
		if s == val {
			return true
		}
	}
	return false
}

func TestPartnerSurfaceNeverReceivesApprovalOrPublicationMutation(t *testing.T) {
	for _, state := range []ActivationStatus{StatusDraft, StatusOpsReview, StatusPartnerActive, StatusClientVisible} {
		if transitions := AllowedTransitionsForSurface(state, "app-partner"); len(transitions) != 0 {
			t.Fatalf("partner surface received state transitions in %s: %#v", state, transitions)
		}
		actions := AllowedActionsForSurface(state, "app-partner")
		for _, forbidden := range []string{"approve_partner", "reject_partner", "publish_store", "hide_store"} {
			if containsAction(actions, forbidden) {
				t.Fatalf("partner surface received forbidden action %q in %s", forbidden, state)
			}
		}
	}
}

func TestClientActionsRequireClientVisibleState(t *testing.T) {
	if got := AllowedActionsForSurface(StatusPartnerActive, "app-client"); len(got) != 0 {
		t.Fatalf("client received discovery actions before publication: %#v", got)
	}
	actions := AllowedActionsForSurface(StatusClientVisible, "app-client")
	if !containsAction(actions, "discover_store") || !containsAction(actions, "read_public_store") {
		t.Fatalf("published store actions are incomplete: %#v", actions)
	}
}

func TestOperatorAllowedActionsMirrorEveryTransition(t *testing.T) {
	states := []ActivationStatus{
		StatusDraft, StatusSubmitted, StatusFieldVisitScheduled,
		StatusFieldVisitCompleted, StatusDocumentsMissing,
		StatusDocumentsUploaded, StatusDocumentsVerified,
		StatusCatalogNotReady, StatusCatalogReady,
		StatusDeliveryModesNotReady, StatusDeliveryModesReady,
		StatusOpsReview, StatusOpsApproved, StatusOpsRejected,
		StatusPartnerActive, StatusPartnerTerminated,
		StatusClientVisible, StatusClientHidden,
	}
	for _, state := range states {
		actions := AllowedActionsForSurface(state, "control-panel")
		for _, transition := range AllowedTransitionsForStatus(state) {
			want := operatorTransitionAction(transition)
			if want == "" || !containsAction(actions, want) {
				t.Fatalf("operator state %s transition %s has no matching allowed action in %#v", state, transition, actions)
			}
		}
	}
}

func TestPartnerStateViewMasksPayoutDataAndIncludesPolicy(t *testing.T) {
	view := BuildPartnerStateView(Partner{
		ActivationStatus:    StatusClientVisible,
		DestinationMethod:   "bank",
		MaskedDestinationReference: "*****1234",
	}, "app-partner")
	if view.MaskedDestinationReference != "*****1234" {
		t.Fatalf("state view leaked raw payout data: %#v", view)
	}
	if !containsAction(view.AllowedActions, "read_own_status") {
		t.Fatalf("partner state view lacks read action: %#v", view.AllowedActions)
	}
	if len(view.AllowedTransitions) != 0 {
		t.Fatalf("partner state view exposed transitions: %#v", view.AllowedTransitions)
	}
}
