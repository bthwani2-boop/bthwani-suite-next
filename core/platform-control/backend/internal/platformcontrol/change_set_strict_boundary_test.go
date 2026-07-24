package platformcontrol

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"testing"
)

func TestJRN040StrictBoundaryRejectsExpandedSensitiveClassifications(t *testing.T) {
	repository := &Repository{}
	for _, classification := range []string{"sensitive", "confidential", "restricted"} {
		t.Run(classification, func(t *testing.T) {
			_, err := repository.CreateChangeSetStrict(
				context.Background(),
				"maker",
				nil,
				"strict-boundary",
				CreateChangeSetInput{
					Title:            "sensitive classification proof",
					Reason:           "negative proof",
					ImpactAssessment: "must not persist",
					RollbackPlan:     "not applicable",
					Items: []CreateChangeSetItemInput{{
						TargetType:       ChangeTargetVariable,
						TargetKey:        "JRN040_STRICT_" + strings.ToUpper(classification),
						OwnerService:     "vault",
						ScopeType:        "global",
						ValueType:        "json",
						Classification:   classification,
						ExpectedRevision: 0,
						ProposedValue:    json.RawMessage(`{"enabled":false}`),
					}},
				},
			)
			if !errors.Is(err, ErrSensitiveValue) {
				t.Fatalf("classification %s must be rejected as sensitive, got %v", classification, err)
			}
		})
	}
}

func TestJRN040StrictBoundaryEnforcesReasonLength(t *testing.T) {
	repository := &Repository{}
	tooLong := strings.Repeat("x", maxGovernedTextLength+1)

	if _, err := repository.RejectChangeSetStrict(context.Background(), "id", "reviewer", nil, "reason-limit", tooLong); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected overlong rejection reason validation error, got %v", err)
	}
	if _, err := repository.RollbackChangeSetStrict(context.Background(), "id", "operator", nil, "reason-limit", ""); !errors.Is(err, ErrRollbackReason) {
		t.Fatalf("expected missing rollback reason error, got %v", err)
	}
	if _, err := repository.RollbackChangeSetStrict(context.Background(), "id", "operator", nil, "reason-limit", tooLong); !errors.Is(err, ErrValidation) {
		t.Fatalf("expected overlong rollback reason validation error, got %v", err)
	}
}
