package support

import "testing"

func TestJRN021OrderRescueTransitions(t *testing.T) {
	allowed := []struct {
		from OrderRescueStatus
		to   OrderRescueStatus
	}{
		{RescueOpen, RescueInvestigating},
		{RescueOpen, RescueActionRequired},
		{RescueInvestigating, RescueResolved},
		{RescueActionRequired, RescueInvestigating},
		{RescueResolved, RescueClosed},
		{RescueResolved, RescueInvestigating},
	}
	for _, tc := range allowed {
		if !validOrderRescueTransition(tc.from, tc.to) {
			t.Fatalf("expected transition %s -> %s to be allowed", tc.from, tc.to)
		}
	}
	if validOrderRescueTransition(RescueClosed, RescueOpen) {
		t.Fatal("closed rescue case must not reopen")
	}
}

func TestJRN021WLTBoundaryIsReferenceOnly(t *testing.T) {
	if err := validateOrderRescueDecision(RescueOwnerWLTReferenceOnly, RescueActionOpenWLTVisibility); err != nil {
		t.Fatalf("expected read-only WLT visibility decision to be valid: %v", err)
	}
	if err := validateOrderRescueDecision(RescueOwnerWLTReferenceOnly, RescueActionCreateFollowUpTask); err == nil {
		t.Fatal("WLT reference owner must not execute a DSH operational mutation")
	}
	if err := validateOrderRescueDecision(RescueOwnerOperations, RescueActionOpenWLTVisibility); err == nil {
		t.Fatal("WLT visibility action must keep its explicit reference-only owner")
	}
}
