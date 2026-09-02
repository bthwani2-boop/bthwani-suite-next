package centralcatalog

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestCatalogPolicyMarshalOmitsWLTFinancialAuthorityFields(t *testing.T) {
	policy := CatalogPolicy{
		ID:                    "policy-1",
		PolicyScope:           "default",
		AllowsProductProposal: true,
	}

	payload, err := json.Marshal(policy)
	if err != nil {
		t.Fatalf("marshal policy: %v", err)
	}
	body := string(payload)
	for _, forbidden := range forbiddenCatalogFinancialPolicyJSONFields {
		if strings.Contains(body, forbidden) {
			t.Fatalf("WLT-owned financial field %q leaked from DSH catalog policy JSON: %s", forbidden, body)
		}
	}
	if !strings.Contains(body, `"allowsProductProposal":true`) {
		t.Fatalf("operational catalog policy field missing from JSON: %s", body)
	}
}

func TestCatalogPolicyPatchRejectsWLTFinancialAuthorityFields(t *testing.T) {
	for _, forbidden := range forbiddenCatalogFinancialPolicyJSONFields {
		t.Run(forbidden, func(t *testing.T) {
			payload := []byte(`{"expectedVersion":1,"` + forbidden + `":0}`)
			var input CatalogPolicyPatchInput
			err := json.Unmarshal(payload, &input)
			if !errors.Is(err, ErrInvalid) {
				t.Fatalf("expected ErrInvalid for WLT-owned field %q, got %v", forbidden, err)
			}
		})
	}
}

func TestCatalogPolicyPatchPreservesOperationalFields(t *testing.T) {
	payload := []byte(`{"expectedVersion":7,"allowsProductProposal":false,"requiresCatalogReview":true,"notes":"catalog-only"}`)
	var input CatalogPolicyPatchInput
	if err := json.Unmarshal(payload, &input); err != nil {
		t.Fatalf("unmarshal operational policy patch: %v", err)
	}
	if input.ExpectedVersion == nil || *input.ExpectedVersion != 7 {
		t.Fatalf("expectedVersion was not preserved: %#v", input.ExpectedVersion)
	}
	if input.AllowsProductProposal == nil || *input.AllowsProductProposal {
		t.Fatalf("allowsProductProposal was not preserved: %#v", input.AllowsProductProposal)
	}
	if input.RequiresCatalogReview == nil || !*input.RequiresCatalogReview {
		t.Fatalf("requiresCatalogReview was not preserved: %#v", input.RequiresCatalogReview)
	}
	if input.Notes == nil || *input.Notes != "catalog-only" {
		t.Fatalf("notes was not preserved: %#v", input.Notes)
	}
}
