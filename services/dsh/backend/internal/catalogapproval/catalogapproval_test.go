package catalogapproval

import "testing"

func TestCatalogApprovalTransitionGraph(t *testing.T) {
	valid := [][2]string{
		{"partner-submitted", "partner-review"},
		{"field-submitted", "partner-review"},
		{"partner-review", "partner-approved"},
		{"partner-approved", "marketing-review"},
		{"marketing-review", "marketing-approved"},
		{"marketing-approved", "catalog-adopted"},
		{"catalog-adopted", "client-visible"},
		{"needs-fix", "partner-submitted"},
		{"needs-fix", "field-submitted"},
		{"needs-fix", "partner-review"},
	}
	for _, transition := range valid {
		if !allowedTransitions[transition[0]][transition[1]] {
			t.Fatalf("expected transition %s -> %s to be allowed", transition[0], transition[1])
		}
	}

	invalid := [][2]string{
		{"partner-submitted", "catalog-adopted"},
		{"field-submitted", "client-visible"},
		{"partner-review", "marketing-approved"},
		{"marketing-review", "client-visible"},
		{"rejected", "partner-review"},
		{"client-visible", "rejected"},
	}
	for _, transition := range invalid {
		if allowedTransitions[transition[0]][transition[1]] {
			t.Fatalf("expected transition %s -> %s to be rejected", transition[0], transition[1])
		}
	}
}

func TestPartnerQueueStagesExcludeInternalPublicationStages(t *testing.T) {
	for _, stage := range []string{"marketing-review", "marketing-approved", "catalog-adopted", "client-visible"} {
		if partnerQueueStages[stage] {
			t.Fatalf("partner queue must not expose internal stage %s", stage)
		}
	}
	for _, stage := range []string{"partner-submitted", "partner-review", "partner-approved", "needs-fix", "rejected"} {
		if !partnerQueueStages[stage] {
			t.Fatalf("partner queue should expose owned stage %s", stage)
		}
	}
}
