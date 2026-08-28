package incident

import (
	"context"
	"errors"
	"testing"
)

func TestReportRejectsMissingOperatorContext(t *testing.T) {
	s := &Service{db: nil}
	cases := []struct {
		name  string
		input ReportInput
	}{
		{
			name: "empty string",
			input: ReportInput{
				OrderID:           "11111111-1111-1111-1111-111111111111",
				OperatorContextID: "",
				TargetEntityID:    "11111111-1111-1111-1111-111111111111",
				IncidentType:      TypeCancel,
				Reason:            "r",
				TicketReference:   "t",
				ActorID:           "a",
				ActorRole:         "operator",
			},
		},
		{
			name: "whitespace only",
			input: ReportInput{
				OrderID:           "11111111-1111-1111-1111-111111111111",
				OperatorContextID: "   ",
				TargetEntityID:    "11111111-1111-1111-1111-111111111111",
				IncidentType:      TypeCancel,
				Reason:            "r",
				TicketReference:   "t",
				ActorID:           "a",
				ActorRole:         "operator",
			},
		},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, err := s.Report(context.Background(), tc.input)
			if err == nil {
				t.Fatalf("expected ErrInvalid when operator_context_id is %q, got nil", tc.input.OperatorContextID)
			}
			if !errors.Is(err, ErrInvalid) {
				t.Fatalf("expected ErrInvalid, got %v", err)
			}
		})
	}
}
