package catalogapproval

import (
	"errors"
	"testing"
)

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

func TestTenantScopeFailsClosedBeforeDatabaseAccess(t *testing.T) {
	_, err := Create(nil, CreateInput{
		EntityType:   "product",
		OwnerActorID: "actor-1",
		Source:       "app-partner",
		Stage:        "partner-submitted",
		Title:        "Product approval",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("Create without tenant must fail with ErrInvalid, got %v", err)
	}

	if _, err := Get(nil, "", "record-1"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("Get without tenant must fail with ErrInvalid, got %v", err)
	}
	if _, err := List(nil, "", "", "", "", 10); !errors.Is(err, ErrInvalid) {
		t.Fatalf("List without tenant must fail with ErrInvalid, got %v", err)
	}
	if _, err := ListPartnerQueue(nil, "", "actor-1", 10); !errors.Is(err, ErrInvalid) {
		t.Fatalf("ListPartnerQueue without tenant must fail with ErrInvalid, got %v", err)
	}
	if _, err := Transition(nil, "", "record-1", "partner-review", "operator", "review"); !errors.Is(err, ErrInvalid) {
		t.Fatalf("Transition without tenant must fail with ErrInvalid, got %v", err)
	}
}
