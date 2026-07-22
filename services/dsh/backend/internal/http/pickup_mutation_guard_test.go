package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMatchPickupMutationRoute(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		method          string
		path            string
		action          string
		surface         string
		sessionRequired bool
		matched         bool
	}{
		{name: "partner ready", method: http.MethodPost, path: "/dsh/partner/orders/11111111-1111-1111-1111-111111111111/pickup/mark-ready", action: "mark_ready", surface: "partner", matched: true},
		{name: "partner notify", method: http.MethodPost, path: "/dsh/partner/orders/11111111-1111-1111-1111-111111111111/pickup/notify", action: "notify_customer", surface: "partner", matched: true},
		{name: "partner arrived", method: http.MethodPost, path: "/dsh/partner/orders/11111111-1111-1111-1111-111111111111/pickup/customer-arrived", action: "customer_arrived", surface: "partner", sessionRequired: true, matched: true},
		{name: "partner verify", method: http.MethodPost, path: "/dsh/partner/orders/11111111-1111-1111-1111-111111111111/pickup/verify", action: "verify_otp", surface: "partner", sessionRequired: true, matched: true},
		{name: "partner no show", method: http.MethodPost, path: "/dsh/partner/orders/11111111-1111-1111-1111-111111111111/pickup/no-show", action: "no_show", surface: "partner", sessionRequired: true, matched: true},
		{name: "operator extend", method: http.MethodPost, path: "/dsh/operator/pickups/11111111-1111-1111-1111-111111111111/extend-window", action: "extend_window", surface: "operator", sessionRequired: true, matched: true},
		{name: "operator reschedule", method: http.MethodPost, path: "/dsh/operator/pickups/11111111-1111-1111-1111-111111111111/reschedule", action: "reschedule", surface: "operator", sessionRequired: true, matched: true},
		{name: "read is not guarded", method: http.MethodGet, path: "/dsh/operator/pickups/11111111-1111-1111-1111-111111111111", matched: false},
		{name: "unknown action", method: http.MethodPost, path: "/dsh/operator/pickups/11111111-1111-1111-1111-111111111111/delete", matched: false},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			route, matched := matchPickupMutationRoute(httptest.NewRequest(test.method, test.path, nil))
			if matched != test.matched {
				t.Fatalf("matched=%v, want %v", matched, test.matched)
			}
			if !matched {
				return
			}
			if route.action != test.action || route.surface != test.surface || route.sessionRequired != test.sessionRequired {
				t.Fatalf("route=%+v, want action=%s surface=%s sessionRequired=%v", route, test.action, test.surface, test.sessionRequired)
			}
			if route.orderID != "11111111-1111-1111-1111-111111111111" {
				t.Fatalf("orderID=%q", route.orderID)
			}
		})
	}
}

func TestPickupMutationPathContextSetsOrderIDBeforeDelegation(t *testing.T) {
	t.Parallel()

	var observed string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		observed = r.PathValue("orderId")
		w.WriteHeader(http.StatusNoContent)
	})
	handler := PickupMutationPathContext(next)
	request := httptest.NewRequest(
		http.MethodPost,
		"/dsh/operator/pickups/11111111-1111-1111-1111-111111111111/reschedule",
		nil,
	)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status=%d", response.Code)
	}
	if observed != "11111111-1111-1111-1111-111111111111" {
		t.Fatalf("observed orderId=%q", observed)
	}
}
