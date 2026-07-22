package http

import (
	"net/http"
	"testing"
)

func TestNotificationDeliveryAuditRouteIsMounted(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	RegisterActorNotificationRoutes(router, nil, nil, nil, nil)
	request, err := http.NewRequest(http.MethodGet, "/dsh/operator/notifications/delivery-attempts?outcome=dead_letter", nil)
	if err != nil {
		t.Fatal(err)
	}
	_, pattern := router.Handler(request)
	expected := "GET /dsh/operator/notifications/delivery-attempts"
	if pattern != expected {
		t.Fatalf("expected route %q, got %q", expected, pattern)
	}
}
