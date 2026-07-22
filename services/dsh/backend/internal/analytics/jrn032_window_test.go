package analytics

import (
	"errors"
	"testing"
	"time"
)

func TestParseWindowNamedPeriods(t *testing.T) {
	now := time.Date(2026, time.July, 22, 10, 30, 0, 0, time.UTC)
	tests := []struct {
		period string
		want   time.Duration
	}{
		{period: "week", want: 7 * 24 * time.Hour},
	}
	for _, tt := range tests {
		window, err := ParseWindow(tt.period, "", "", now)
		if err != nil {
			t.Fatalf("ParseWindow(%q): %v", tt.period, err)
		}
		if got := window.To.Sub(window.From); got != tt.want {
			t.Fatalf("ParseWindow(%q) duration=%v want=%v", tt.period, got, tt.want)
		}
	}

	today, err := ParseWindow("today", "", "", now)
	if err != nil {
		t.Fatal(err)
	}
	if today.From.Hour() != 0 || today.From.Minute() != 0 || today.From.Day() != now.Day() {
		t.Fatalf("today start=%s", today.From)
	}
}

func TestParseWindowRejectsUnknownAndUnsafeRanges(t *testing.T) {
	now := time.Date(2026, time.July, 22, 10, 30, 0, 0, time.UTC)
	if _, err := ParseWindow("quarter", "", "", now); !errors.Is(err, ErrInvalidAnalyticsPeriod) {
		t.Fatalf("unknown period error=%v", err)
	}
	if _, err := ParseWindow("", "2026-07-01", "", now); !errors.Is(err, ErrInvalidAnalyticsRange) {
		t.Fatalf("partial range error=%v", err)
	}
	if _, err := ParseWindow("", "2025-01-01", "2026-07-01", now); !errors.Is(err, ErrInvalidAnalyticsRange) {
		t.Fatalf("oversized range error=%v", err)
	}
	if _, err := ParseWindow("", "2026-07-20", "2026-07-19", now); !errors.Is(err, ErrInvalidAnalyticsRange) {
		t.Fatalf("reversed range error=%v", err)
	}
}

func TestParseWindowSupportsDateAndRFC3339Ranges(t *testing.T) {
	now := time.Date(2026, time.July, 22, 23, 0, 0, 0, time.UTC)
	dateWindow, err := ParseWindow("", "2026-07-20", "2026-07-21", now)
	if err != nil {
		t.Fatal(err)
	}
	if dateWindow.Period != "custom" || dateWindow.To.Sub(dateWindow.From) != 48*time.Hour {
		t.Fatalf("date window=%+v", dateWindow)
	}
	rfcWindow, err := ParseWindow("", "2026-07-20T10:00:00Z", "2026-07-20T12:00:00Z", now)
	if err != nil {
		t.Fatal(err)
	}
	if rfcWindow.To.Sub(rfcWindow.From) != 2*time.Hour {
		t.Fatalf("rfc duration=%v", rfcWindow.To.Sub(rfcWindow.From))
	}
}
