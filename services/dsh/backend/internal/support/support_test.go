package support

import "testing"

func TestCreateTicketRequiresReporterSubjectAndDescription(t *testing.T) {
	cases := []CreateTicketInput{
		{Subject: "s", Description: "d"},
		{ReporterID: "r1", Description: "d"},
		{ReporterID: "r1", Subject: "s"},
	}
	for _, input := range cases {
		_, err := CreateTicket(nil, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestAddMessageRequiresSenderAndBody(t *testing.T) {
	cases := []AddMessageInput{
		{Body: "hello"},
		{SenderID: "sender-1"},
	}
	for _, input := range cases {
		_, err := AddMessage(nil, "ticket-1", input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestCreateIncidentRequiresTitleAndRaisedBy(t *testing.T) {
	cases := []CreateIncidentInput{
		{RaisedBy: "operator-1"},
		{Title: "Payments degraded"},
	}
	for _, input := range cases {
		_, err := CreateIncident(nil, input)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for input %+v, got %v", input, err)
		}
	}
}

func TestTicketStatusConstantsAreDistinct(t *testing.T) {
	statuses := map[TicketStatus]bool{
		StatusOpen: true, StatusInReview: true, StatusPendingUser: true,
		StatusResolved: true, StatusClosed: true,
	}
	if len(statuses) != 5 {
		t.Fatalf("expected 5 distinct ticket statuses, got %d", len(statuses))
	}
}

func TestIncidentSeverityConstantsAreDistinct(t *testing.T) {
	severities := map[IncidentSeverity]bool{
		SeverityLow: true, SeverityMedium: true, SeverityHigh: true, SeverityCritical: true,
	}
	if len(severities) != 4 {
		t.Fatalf("expected 4 distinct incident severities, got %d", len(severities))
	}
}
