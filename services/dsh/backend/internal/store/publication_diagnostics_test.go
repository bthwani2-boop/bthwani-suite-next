package store

import (
	"strings"
	"testing"
)

func TestDiagnoseStorePublicationMapsCanonicalViewReadback(t *testing.T) {
	row := eligibleStoreRow()
	row.PublicationDecision = PublicationPublished
	row.BlockingReasonCodes = []string{}
	diagnostics := DiagnoseStorePublication(row)
	if !diagnostics.IsReady || len(diagnostics.Blockers) != 0 {
		t.Fatalf("expected canonical published decision, got %+v", diagnostics)
	}
}

func TestDiagnoseStorePublicationFailsClosedOnCanonicalBlockers(t *testing.T) {
	row := eligibleStoreRow()
	row.PublicationDecision = PublicationBlocked
	row.BlockingReasonCodes = []string{
		"STORE_NOT_PUBLISHED",
		"PARTNER_NOT_CLIENT_VISIBLE",
		"APPROVED_ASSORTMENT_MISSING",
	}
	diagnostics := DiagnoseStorePublication(row)
	if diagnostics.IsReady || len(diagnostics.BlockerCodes) != 3 {
		t.Fatalf("expected canonical blockers, got %+v", diagnostics)
	}
	joined := strings.Join(diagnostics.Blockers, "\n")
	for _, code := range row.BlockingReasonCodes {
		if !strings.Contains(joined, code+":") {
			t.Fatalf("missing mapped blocker %s in %v", code, diagnostics.Blockers)
		}
	}
}

func TestDiagnoseStorePublicationFailsClosedWhenCanonicalDecisionMissing(t *testing.T) {
	row := eligibleStoreRow()
	row.PublicationDecision = ""
	row.BlockingReasonCodes = nil
	diagnostics := DiagnoseStorePublication(row)
	if diagnostics.IsReady || !strings.Contains(strings.Join(diagnostics.Blockers, "\n"), "CANONICAL_PUBLICATION_DECISION_MISSING:") {
		t.Fatalf("missing canonical decision must fail closed: %+v", diagnostics)
	}
}
