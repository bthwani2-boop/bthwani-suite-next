package http

import (
	"net/http"
	"testing"
	"time"
)

func TestJourneys015Through020ExposeGovernedRoutes(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	cases := []struct {
		journey string
		method  string
		path    string
		pattern string
	}{
		{journey: "JRN-015 pickup state", method: http.MethodGet, path: "/dsh/partner/orders/order-1/pickup", pattern: "GET /dsh/partner/orders/{orderId}/pickup"},
		{journey: "JRN-015 client pickup state", method: http.MethodGet, path: "/dsh/client/orders/order-1/pickup", pattern: "GET /dsh/client/orders/{orderId}/pickup"},
		{journey: "JRN-015 pickup verify", method: http.MethodPost, path: "/dsh/partner/orders/order-1/pickup/verify", pattern: "POST /dsh/partner/orders/{orderId}/pickup/verify"},
		{journey: "JRN-016 partner proof", method: http.MethodPost, path: "/dsh/partner/orders/order-1/partner-delivery/proof", pattern: "POST /dsh/partner/orders/{orderId}/partner-delivery/proof"},
		{journey: "JRN-017 captain location", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/assignment-1/location", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/location"},
		{journey: "JRN-017 client tracking", method: http.MethodGet, path: "/dsh/client/orders/order-1/tracking", pattern: "GET /dsh/client/orders/{orderId}/tracking"},
		{journey: "JRN-018 captain proof", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/assignment-1/pod", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/pod"},
		{journey: "JRN-019 operator cancellation", method: http.MethodPost, path: "/dsh/operator/orders/order-1/cancel", pattern: "POST /dsh/operator/orders/{orderId}/cancel"},
		{journey: "JRN-020 exception report", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/assignment-1/exceptions", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/exceptions"},
		{journey: "JRN-020 return arrival", method: http.MethodPost, path: "/dsh/captain/dispatch/assignments/assignment-1/return-to-store/arrive", pattern: "POST /dsh/captain/dispatch/assignments/{assignmentId}/return-to-store/arrive"},
		{journey: "JRN-020 partner receipt", method: http.MethodPost, path: "/dsh/partner/orders/order-1/return-to-store/accept", pattern: "POST /dsh/partner/orders/{orderId}/return-to-store/accept"},
	}

	for _, tc := range cases {
		t.Run(tc.journey, func(t *testing.T) {
			request, err := http.NewRequest(tc.method, tc.path, nil)
			if err != nil {
				t.Fatal(err)
			}
			_, pattern := router.Handler(request)
			if pattern != tc.pattern {
				t.Fatalf("expected route %q, got %q", tc.pattern, pattern)
			}
		})
	}
}

func TestDispatchLocationTimestampPolicy(t *testing.T) {
	now := time.Date(2026, time.July, 21, 12, 0, 0, 0, time.UTC)
	previous := now.Add(-time.Minute)

	cases := []struct {
		name       string
		recordedAt time.Time
		previous   *time.Time
		want       dispatchLocationTimestampDecision
	}{
		{name: "accept fresh", recordedAt: now.Add(-10 * time.Second), previous: &previous, want: locationTimestampAccepted},
		{name: "reject stale", recordedAt: now.Add(-maxLocationSampleAge - time.Second), want: locationTimestampStale},
		{name: "reject future", recordedAt: now.Add(maxLocationFutureSkew + time.Second), want: locationTimestampFuture},
		{name: "reject duplicate", recordedAt: previous, previous: &previous, want: locationTimestampOutOfOrder},
		{name: "reject older", recordedAt: previous.Add(-time.Second), previous: &previous, want: locationTimestampOutOfOrder},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := validateDispatchLocationTimestamp(tc.recordedAt, now, tc.previous); got != tc.want {
				t.Fatalf("expected %q, got %q", tc.want, got)
			}
		})
	}
}
