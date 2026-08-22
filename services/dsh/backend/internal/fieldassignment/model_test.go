package fieldassignment

import (
	"testing"
	"time"
)

func TestNormalizeCreateInputCanonicalizesDefaultsAndDueDate(t *testing.T) {
	input := normalizeCreateInput(CreateInput{
		FieldActorID: " field-1 ", BusinessTaskKey: " task-1 ", StoreNameHint: " متجر ",
		PhoneHint: " +967700000001 ", AddressHint: " address ",
	})
	if input.FieldActorID != "field-1" || input.BusinessTaskKey != "task-1" || input.StoreNameHint != "متجر" || input.PhoneHint != "+967700000001" || input.AddressHint != "address" {
		t.Fatalf("create input was not trimmed: %#v", input)
	}
	if input.Priority != "normal" || input.SlaMinutes != 1440 || input.DueAt == nil {
		t.Fatalf("create defaults were not applied: %#v", input)
	}
	if input.DueAt.Before(time.Now().UTC()) {
		t.Fatalf("default due date is already expired: %s", input.DueAt)
	}

	dueAt := time.Now().UTC().Add(time.Hour)
	withDefaults := normalizeCreateInput(CreateInput{Priority: "urgent", SlaMinutes: 30, DueAt: &dueAt})
	if withDefaults.Priority != "urgent" || withDefaults.SlaMinutes != 30 || withDefaults.DueAt != &dueAt {
		t.Fatalf("explicit create values were overwritten: %#v", withDefaults)
	}
}

func TestApplyDerivedOnlyMarksActiveOverdueAssignments(t *testing.T) {
	old := time.Now().UTC().Add(-time.Minute)
	assignment := Assignment{DueAt: &old, Status: StatusAssigned}
	applyDerived(&assignment)
	if !assignment.Overdue {
		t.Fatal("active assignment past due date must be overdue")
	}
	assignment.Status = StatusCancelled
	applyDerived(&assignment)
	if assignment.Overdue {
		t.Fatal("cancelled assignment must not be overdue")
	}
	assignment.DueAt = nil
	assignment.Status = StatusInProgress
	applyDerived(&assignment)
	if assignment.Overdue {
		t.Fatal("assignment without due date must not be overdue")
	}
}

func TestCreateInputRequiresBusinessLeadAndBoundedLocation(t *testing.T) {
	phone := "+967777777777"
	latitude := 15.35
	longitude := 44.20

	cases := []struct {
		name  string
		input CreateInput
		valid bool
	}{
		{"valid phone lead", CreateInput{FieldActorID: "field-1", BusinessTaskKey: "lead-1", StoreNameHint: "متجر 1", PhoneHint: phone}, true},
		{"valid address lead", CreateInput{FieldActorID: "field-1", BusinessTaskKey: "lead-2", StoreNameHint: "متجر 1", AddressHint: "صنعاء"}, true},
		{"missing lead", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1"}, false},
		{"partial location", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone, LocationLatitude: &latitude}, false},
		{"invalid latitude", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone, LocationLatitude: ptr(91), LocationLongitude: &longitude}, false},
		{"invalid longitude", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone, LocationLatitude: &latitude, LocationLongitude: ptr(181)}, false},
		{"invalid priority", CreateInput{FieldActorID: "field-1", BusinessTaskKey: "lead-3", StoreNameHint: "متجر 1", PhoneHint: phone, Priority: "critical"}, false},
		{"negative SLA", CreateInput{FieldActorID: "field-1", BusinessTaskKey: "lead-4", StoreNameHint: "متجر 1", PhoneHint: phone, SlaMinutes: -1}, false},
		{"excessive SLA", CreateInput{FieldActorID: "field-1", BusinessTaskKey: "lead-5", StoreNameHint: "متجر 1", PhoneHint: phone, SlaMinutes: 43201}, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := tc.input.Validate() == nil; got != tc.valid {
				t.Fatalf("Validate() = %v, want %v", got, tc.valid)
			}
		})
	}
}

func TestStatusIsCancelledOnlyForCancelledAssignments(t *testing.T) {
	for _, status := range []Status{StatusAssigned, StatusInProgress, StatusDraftLinked} {
		if !IsActive(status) {
			t.Fatalf("status %q must remain visible as active history", status)
		}
	}
	if IsActive(StatusCancelled) {
		t.Fatal("cancelled assignment must not be active")
	}
}

func TestReassignRequiresFormalHandoffAfterWorkStarts(t *testing.T) {
	input := ReassignInput{ExpectedVersion: 2, FieldActorID: "field-2"}
	if err := validateReassign(StatusInProgress, input); err != ErrInvalidTransition {
		t.Fatalf("reassign during active work must require handoff, got %v", err)
	}
	input.Handoff = true
	if err := validateReassign(StatusInProgress, input); err != nil {
		t.Fatalf("formal handoff should permit reassignment, got %v", err)
	}
	if err := validateReassign(StatusAssigned, ReassignInput{ExpectedVersion: 2, FieldActorID: "field-2"}); err != nil {
		t.Fatalf("unstarted assignment should permit ordinary reassignment, got %v", err)
	}
}

func ptr(value float64) *float64 { return &value }
