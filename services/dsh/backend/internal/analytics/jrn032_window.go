package analytics

import (
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalidAnalyticsPeriod = errors.New("invalid analytics period")
	ErrInvalidAnalyticsRange  = errors.New("invalid analytics time range")
)

const MaxAnalyticsRange = 366 * 24 * time.Hour

type Window struct {
	Period string    `json:"period"`
	From   time.Time `json:"from"`
	To     time.Time `json:"to"`
}

type Metadata struct {
	SourceSystem     string    `json:"sourceSystem"`
	ReadOnly         bool      `json:"readOnly"`
	GeneratedAt      time.Time `json:"generatedAt"`
	WindowFrom       time.Time `json:"windowFrom"`
	WindowTo         time.Time `json:"windowTo"`
	FreshnessSeconds int       `json:"freshnessSeconds"`
	Lineage          []string  `json:"lineage"`
}

func ParseWindow(period, fromValue, toValue string, now time.Time) (Window, error) {
	now = now.UTC()
	period = strings.TrimSpace(period)
	fromValue = strings.TrimSpace(fromValue)
	toValue = strings.TrimSpace(toValue)
	if fromValue != "" || toValue != "" {
		if fromValue == "" || toValue == "" {
			return Window{}, ErrInvalidAnalyticsRange
		}
		from, err := parseAnalyticsTime(fromValue, false)
		if err != nil {
			return Window{}, ErrInvalidAnalyticsRange
		}
		to, err := parseAnalyticsTime(toValue, true)
		if err != nil || !to.After(from) || to.Sub(from) > MaxAnalyticsRange || to.After(now.Add(time.Minute)) {
			return Window{}, ErrInvalidAnalyticsRange
		}
		return Window{Period: "custom", From: from, To: to}, nil
	}
	if period == "" {
		period = "today"
	}
	var from time.Time
	switch period {
	case "today":
		year, month, day := now.Date()
		from = time.Date(year, month, day, 0, 0, 0, 0, time.UTC)
	case "week":
		from = now.AddDate(0, 0, -7)
	case "month":
		from = now.AddDate(0, -1, 0)
	default:
		return Window{}, ErrInvalidAnalyticsPeriod
	}
	return Window{Period: period, From: from, To: now}, nil
}

func parseAnalyticsTime(value string, endOfDay bool) (time.Time, error) {
	if parsed, err := time.Parse(time.RFC3339, value); err == nil {
		return parsed.UTC(), nil
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		return time.Time{}, err
	}
	if endOfDay {
		return parsed.Add(24 * time.Hour), nil
	}
	return parsed, nil
}

func NewMetadata(window Window, lineage ...string) Metadata {
	return Metadata{
		SourceSystem: "DSH",
		ReadOnly: true,
		GeneratedAt: time.Now().UTC(),
		WindowFrom: window.From,
		WindowTo: window.To,
		FreshnessSeconds: 0,
		Lineage: append([]string(nil), lineage...),
	}
}
