package incident

import "testing"

func TestSameIncidentCommandRejectsAllMaterialDivergence(t *testing.T) {
	base := Incident{
		OrderID:          "11111111-1111-1111-1111-111111111111",
		TargetEntityType: TargetOrder,
		TargetEntityID:   "11111111-1111-1111-1111-111111111111",
		IncidentType:     TypeCancel,
		Reason:           "governed cancellation",
		TicketReference:  "ticket-1",
		ActorID:          "actor-1",
		ActorRole:        "operator",
	}
	corr := "corr-1"
	base.CorrelationID = &corr

	baseInput := ReportInput{
		OrderID:          base.OrderID,
		TargetEntityType: base.TargetEntityType,
		TargetEntityID:   base.TargetEntityID,
		IncidentType:     base.IncidentType,
		Reason:           base.Reason,
		TicketReference:  base.TicketReference,
		ActorID:          base.ActorID,
		ActorRole:        base.ActorRole,
		CorrelationID:    corr,
	}

	if !sameIncidentCommand(&base, baseInput) {
		t.Fatal("identical input must match")
	}

	divergences := []struct {
		name   string
		mutate func(*ReportInput)
	}{
		{"different reason", func(in *ReportInput) { in.Reason = "different" }},
		{"different ticket", func(in *ReportInput) { in.TicketReference = "ticket-2" }},
		{"different actor role", func(in *ReportInput) { in.ActorRole = "supervisor" }},
		{"different target entity id", func(in *ReportInput) { in.TargetEntityID = "99999999-9999-9999-9999-999999999999" }},
		{"different incident type", func(in *ReportInput) { in.IncidentType = TypeSuspend }},
		{"different correlation id", func(in *ReportInput) { in.CorrelationID = "corr-2" }},
	}
	for _, d := range divergences {
		t.Run(d.name, func(t *testing.T) {
			divergent := baseInput
			d.mutate(&divergent)
			if sameIncidentCommand(&base, divergent) {
				t.Fatalf("sameIncidentCommand accepted divergence on %s", d.name)
			}
		})
	}
}

func TestSameIncidentCommandRejectsNilExisting(t *testing.T) {
	if sameIncidentCommand(nil, ReportInput{CorrelationID: "x"}) {
		t.Fatal("nil existing must not match")
	}
}

func TestSameIncidentCommandRejectsNilCorrelationID(t *testing.T) {
	existing := &Incident{OrderID: "1", CorrelationID: nil}
	input := ReportInput{OrderID: "1", CorrelationID: "x"}
	if sameIncidentCommand(existing, input) {
		t.Fatal("nil correlation_id on existing must not match")
	}
}
