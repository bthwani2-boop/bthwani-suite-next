package fieldassignment

import "testing"

func TestCreateInputRequiresBusinessLeadAndBoundedLocation(t *testing.T) {
	phone := "+967777777777"
	latitude := 15.35
	longitude := 44.20

	cases := []struct {
		name  string
		input CreateInput
		valid bool
	}{
		{"valid phone lead", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone}, true},
		{"valid address lead", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", AddressHint: "صنعاء"}, true},
		{"missing lead", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1"}, false},
		{"partial location", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone, LocationLatitude: &latitude}, false},
		{"invalid latitude", CreateInput{FieldActorID: "field-1", StoreNameHint: "متجر 1", PhoneHint: phone, LocationLatitude: ptr(91), LocationLongitude: &longitude}, false},
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
		if !IsActive(status) { t.Fatalf("status %q must remain visible as active history", status) }
	}
	if IsActive(StatusCancelled) { t.Fatal("cancelled assignment must not be active") }
}

func ptr(value float64) *float64 { return &value }
