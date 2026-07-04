package analytics

import (
	"testing"
	"time"
)

func TestPeriodFilterDefaultAndTodayTruncateToMidnightUTC(t *testing.T) {
	for _, period := range []string{"today", "unknown", ""} {
		got := periodFilter(period)
		if got.Hour() != 0 || got.Minute() != 0 || got.Second() != 0 || got.Nanosecond() != 0 {
			t.Fatalf("period=%q: expected midnight UTC, got %v", period, got)
		}
		if got.Location() != time.UTC {
			t.Fatalf("period=%q: expected UTC location, got %v", period, got.Location())
		}
		now := time.Now().UTC()
		if got.Year() != now.Year() || got.Month() != now.Month() || got.Day() != now.Day() {
			t.Fatalf("period=%q: expected today's date, got %v (now=%v)", period, got, now)
		}
	}
}

func TestPeriodFilterWeekIsSevenDaysAgo(t *testing.T) {
	got := periodFilter("week")
	expected := time.Now().UTC().AddDate(0, 0, -7)
	if diff := expected.Sub(got); diff < -time.Minute || diff > time.Minute {
		t.Fatalf("expected ~7 days ago, got %v (expected ~%v)", got, expected)
	}
}

func TestPeriodFilterMonthIsOneCalendarMonthAgo(t *testing.T) {
	got := periodFilter("month")
	expected := time.Now().UTC().AddDate(0, -1, 0)
	if diff := expected.Sub(got); diff < -time.Minute || diff > time.Minute {
		t.Fatalf("expected ~1 month ago, got %v (expected ~%v)", got, expected)
	}
}

func TestPeriodFilterWeekIsBeforeToday(t *testing.T) {
	week := periodFilter("week")
	today := periodFilter("today")
	if !week.Before(today) {
		t.Fatalf("expected week cutoff (%v) to be before today's cutoff (%v)", week, today)
	}
}
