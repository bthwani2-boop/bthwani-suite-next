package orders

import (
	"testing"
	"time"
)

func TestMapWltPaymentProjection(t *testing.T) {
	cases := []struct {
		method string
		status string
		want   string
	}{
		{"cod", "initiated", "cash_due"},
		{"cod", "reference_created", "cash_due"},
		{"official_wallet", "reference_created", "pending"},
		{"official_wallet", "captured", "confirmed"},
		{"mixed", "refunded", "refunded"},
		{"official_wallet", "failed", "failed"},
		{"official_wallet", "cancelled", "cancelled"},
		{"official_wallet", "expired", "expired"},
	}
	for _, item := range cases {
		got, err := mapWltPaymentProjection(item.method, item.status)
		if err != nil {
			t.Fatalf("map %s/%s: %v", item.method, item.status, err)
		}
		if got != item.want {
			t.Errorf("map %s/%s=%s, want %s", item.method, item.status, got, item.want)
		}
	}
	if _, err := mapWltPaymentProjection("official_wallet", "invented"); err == nil {
		t.Fatal("unsupported WLT status must fail closed")
	}
}

func TestNextPaymentProjectionAttempt(t *testing.T) {
	if got := nextPaymentProjectionAttempt("reference_created"); got != 30*time.Second {
		t.Fatalf("pending projection cadence=%s, want 30s", got)
	}
	if got := nextPaymentProjectionAttempt("captured"); got != 5*time.Minute {
		t.Fatalf("captured projection cadence=%s, want 5m", got)
	}
	if got := nextPaymentProjectionAttempt("refunded"); got != 30*time.Minute {
		t.Fatalf("terminal projection cadence=%s, want 30m", got)
	}
}
