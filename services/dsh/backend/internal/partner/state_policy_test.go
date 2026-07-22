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
		{StatusPartnerDeactivated, StatusClientVisible},
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
		StatusPartnerActive, StatusPartnerDeactivated,
		StatusClientVisible, StatusClientHidden,
	}
	for _, state := range states {
		if IsTransitionAllowed(state, state) {
			t.Fatalf("state machine permits a self transition for %s", state)
		}
	}
}

func TestFieldSurfaceCanOnlySubmitOwnedDraft(t *testing.T) {
	transitions := AllowedTransitionsForSurface(StatusDraft, "app-field")
	if len(transitions) != 1 || transitions[0] != StatusSubmitted {
		t.Fatalf("field draft transitions = %#v, want submitted only", transitions)
	}
	if got := AllowedTransitionsForSurface(StatusOpsReview, "app-field"); len(got) != 0 {
		t.Fatalf("field actor received review transitions: %#v", got)
	}
	actions := AllowedActionsForSurface(StatusDraft, "app-field")
	for _, action := range []string{"update_owned_draft", "update_first_store", "upload_document", "capture_field_visit", "submit_for_review"} {
		if !containsAction(actions, action) {
			t.Fatalf("field draft action %q is missing from %#v", action, actions)
		}
	}
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
		StatusPartnerActive, StatusPartnerDeactivated,
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
		BankAccountNumber:   "raw-account",
		BankIBAN:            "raw-iban",
		PayoutMobileNumber:  "raw-mobile",
		MaskedAccountNumber: "*****1234",
		MaskedIBAN:          "********5678",
		MaskedMobileNumber:  "*******0001",
	}, "app-partner")
	if view.BankAccountNumber != "*****1234" || view.BankIBAN != "********5678" || view.PayoutMobileNumber != "*******0001" {
		t.Fatalf("state view leaked raw payout data: %#v", view)
	}
	if !containsAction(view.AllowedActions, "read_own_status") {
		t.Fatalf("partner state view lacks read action: %#v", view.AllowedActions)
	}
	if len(view.AllowedTransitions) != 0 {
		t.Fatalf("partner state view exposed transitions: %#v", view.AllowedTransitions)
	}
}
