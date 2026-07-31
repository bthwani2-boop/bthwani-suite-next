package workforce

import "testing"

func TestCaptainPromotionRequiresPerformanceEvidence(t *testing.T) {
	valid := PromoteCaptainInput{
		CompletedDeliveries:       12,
		CompletionRateBasisPoints: 9500,
		SevereIncidentFree:        true,
		EvidenceMediaRefs:         []string{"media://captain/performance-review"},
		DecisionNote:              "اعتماد العمليات بعد مراجعة الأداء",
	}
	if err := validateCaptainPromotionInput(valid); err != nil {
		t.Fatalf("expected evidence-backed promotion input to pass: %v", err)
	}

	cases := []struct {
		name  string
		input PromoteCaptainInput
	}{
		{name: "no deliveries", input: PromoteCaptainInput{CompletionRateBasisPoints: 9500, SevereIncidentFree: true, EvidenceMediaRefs: valid.EvidenceMediaRefs, DecisionNote: valid.DecisionNote}},
		{name: "invalid rate", input: PromoteCaptainInput{CompletedDeliveries: 12, CompletionRateBasisPoints: 10001, SevereIncidentFree: true, EvidenceMediaRefs: valid.EvidenceMediaRefs, DecisionNote: valid.DecisionNote}},
		{name: "severe incident", input: PromoteCaptainInput{CompletedDeliveries: 12, CompletionRateBasisPoints: 9500, SevereIncidentFree: false, EvidenceMediaRefs: valid.EvidenceMediaRefs, DecisionNote: valid.DecisionNote}},
		{name: "no evidence", input: PromoteCaptainInput{CompletedDeliveries: 12, CompletionRateBasisPoints: 9500, SevereIncidentFree: true, DecisionNote: valid.DecisionNote}},
		{name: "no decision", input: PromoteCaptainInput{CompletedDeliveries: 12, CompletionRateBasisPoints: 9500, SevereIncidentFree: true, EvidenceMediaRefs: valid.EvidenceMediaRefs}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateCaptainPromotionInput(tc.input); err == nil {
				t.Fatal("expected invalid promotion input to be rejected")
			}
		})
	}
}

func TestProviderIncidentTransitionGraph(t *testing.T) {
	allowed := [][2]string{
		{"reported", "under_review"},
		{"under_review", "provider_notified"},
		{"provider_notified", "appeal_window"},
		{"appeal_window", "approved"},
		{"approved", "financial_action_posted"},
		{"financial_action_posted", "closed"},
		{"approved", "reversed"},
	}
	for _, transition := range allowed {
		if !allowedProviderIncidentTransition(transition[0], transition[1]) {
			t.Fatalf("expected transition %s -> %s to be allowed", transition[0], transition[1])
		}
	}

	forbidden := [][2]string{
		{"reported", "financial_action_posted"},
		{"appeal_window", "closed"},
		{"rejected", "approved"},
		{"closed", "under_review"},
	}
	for _, transition := range forbidden {
		if allowedProviderIncidentTransition(transition[0], transition[1]) {
			t.Fatalf("expected transition %s -> %s to be rejected", transition[0], transition[1])
		}
	}
}

func TestCleanEvidenceRefsRemovesEmptyAndDuplicateValues(t *testing.T) {
	cleaned := cleanEvidenceRefs([]string{" media://one ", "", "media://one", "media://two"})
	if len(cleaned) != 2 || cleaned[0] != "media://one" || cleaned[1] != "media://two" {
		t.Fatalf("unexpected cleaned evidence: %#v", cleaned)
	}
}
