package notifications

import (
	"reflect"
	"testing"
)

func TestFormatPgTextArrayEmpty(t *testing.T) {
	if got := formatPgTextArray(nil); got != "{}" {
		t.Fatalf("expected {} for nil list, got %q", got)
	}
	if got := formatPgTextArray([]string{}); got != "{}" {
		t.Fatalf("expected {} for empty slice, got %q", got)
	}
}

func TestFormatPgTextArrayQuotesEachElement(t *testing.T) {
	got := formatPgTextArray([]string{"client", "partner"})
	want := `{"client","partner"}`
	if got != want {
		t.Fatalf("expected %q, got %q", want, got)
	}
}

func TestSplitPgArraySimpleValues(t *testing.T) {
	got := splitPgArray("client,partner,captain")
	want := []string{"client", "partner", "captain"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
}

func TestSplitPgArraySingleValue(t *testing.T) {
	got := splitPgArray("client")
	want := []string{"client"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
}

func TestSplitPgArrayEmptyStringYieldsNoElements(t *testing.T) {
	got := splitPgArray("")
	if len(got) != 0 {
		t.Fatalf("expected no elements for empty input, got %v", got)
	}
}

func TestPqTextArrayScanNilYieldsEmptySlice(t *testing.T) {
	var out []string
	scanner := pq_TextArray(&out)
	if err := scanner.Scan(nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty slice for nil src, got %v", out)
	}
}

func TestPqTextArrayScanEmptyPgArray(t *testing.T) {
	var out []string
	scanner := pq_TextArray(&out)
	if err := scanner.Scan([]byte("{}")); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(out) != 0 {
		t.Fatalf("expected empty slice for {}, got %v", out)
	}
}

func TestPqTextArrayScanBytesWithSimpleValues(t *testing.T) {
	var out []string
	scanner := pq_TextArray(&out)
	if err := scanner.Scan([]byte("{client,partner}")); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []string{"client", "partner"}
	if !reflect.DeepEqual(out, want) {
		t.Fatalf("expected %v, got %v", want, out)
	}
}

func TestPqTextArrayScanStringWithSimpleValues(t *testing.T) {
	var out []string
	scanner := pq_TextArray(&out)
	if err := scanner.Scan("{captain}"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	want := []string{"captain"}
	if !reflect.DeepEqual(out, want) {
		t.Fatalf("expected %v, got %v", want, out)
	}
}

func TestUpsertNotificationPreferencesRequiresActorAndTopic(t *testing.T) {
	cases := []struct {
		actorID   string
		actorType string
		topic     string
	}{
		{"", "client", "orders"},
		{"actor-1", "", "orders"},
		{"actor-1", "client", ""},
	}
	for _, c := range cases {
		_, err := UpsertNotificationPreferences(nil, c.actorID, c.actorType, c.topic, true)
		if err != ErrInvalid {
			t.Fatalf("expected ErrInvalid for %+v, got %v", c, err)
		}
	}
}

func TestUpsertPlatformNotificationConfigRequiresTopic(t *testing.T) {
	_, err := UpsertPlatformNotificationConfig(nil, "", []string{"client"}, true, "desc", "admin-1")
	if err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for empty topic, got %v", err)
	}
}
