package dispatch

import "testing"

func TestNormalizeCaptainDispatchAvailabilityAllowsOnlyCaptainOwnedStates(t *testing.T) {
	for _, testCase := range []struct {
		input string
		want  string
	}{
		{input: "available", want: "available"},
		{input: "unavailable", want: "offline"},
	} {
		got, err := normalizeCaptainDispatchAvailability(testCase.input)
		if err != nil {
			t.Fatalf("normalizeCaptainDispatchAvailability(%q): %v", testCase.input, err)
		}
		if got != testCase.want {
			t.Fatalf("normalizeCaptainDispatchAvailability(%q) = %q, want %q", testCase.input, got, testCase.want)
		}
	}

	for _, input := range []string{"break", "planned-leave", "busy", "suspended", ""} {
		if _, err := normalizeCaptainDispatchAvailability(input); err == nil {
			t.Fatalf("normalizeCaptainDispatchAvailability(%q) unexpectedly succeeded", input)
		}
	}
}

func TestCaptainAvailabilityStatusUsesWorkforceNoticeBeforeDispatchState(t *testing.T) {
	for _, testCase := range []struct {
		dispatchStatus string
		noticeType     string
		want           string
	}{
		{dispatchStatus: "available", noticeType: "", want: "available"},
		{dispatchStatus: "offline", noticeType: "", want: "unavailable"},
		{dispatchStatus: "available", noticeType: "break", want: "break"},
		{dispatchStatus: "available", noticeType: "planned_leave", want: "planned-leave"},
		{dispatchStatus: "offline", noticeType: "rest", want: "break"},
		{dispatchStatus: "offline", noticeType: "leave", want: "planned-leave"},
		{dispatchStatus: "offline", noticeType: "vacation", want: "planned-leave"},
		{dispatchStatus: "unknown", noticeType: "", want: "unavailable"},
	} {
		if got := captainAvailabilityStatus(testCase.dispatchStatus, testCase.noticeType); got != testCase.want {
			t.Fatalf("captainAvailabilityStatus(%q, %q) = %q, want %q", testCase.dispatchStatus, testCase.noticeType, got, testCase.want)
		}
	}
}

func TestNormalizeCaptainAvailabilityIdentityTrimsAndRequiresBothActors(t *testing.T) {
	operatorContextID, captainID, err := normalizeCaptainAvailabilityIdentity(" context-1 ", " captain-1 ")
	if err != nil {
		t.Fatalf("valid identity rejected: %v", err)
	}
	if operatorContextID != "context-1" || captainID != "captain-1" {
		t.Fatalf("identity was not canonicalized: %q %q", operatorContextID, captainID)
	}
	for _, input := range [][2]string{{"", "captain-1"}, {"context-1", ""}, {" ", " "}} {
		if _, _, err := normalizeCaptainAvailabilityIdentity(input[0], input[1]); err == nil {
			t.Fatalf("invalid identity %#v was accepted", input)
		}
	}
}
