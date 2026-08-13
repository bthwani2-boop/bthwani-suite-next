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
	} {
		if got := captainAvailabilityStatus(testCase.dispatchStatus, testCase.noticeType); got != testCase.want {
			t.Fatalf("captainAvailabilityStatus(%q, %q) = %q, want %q", testCase.dispatchStatus, testCase.noticeType, got, testCase.want)
		}
	}
}
