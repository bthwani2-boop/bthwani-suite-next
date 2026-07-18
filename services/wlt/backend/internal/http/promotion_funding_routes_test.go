package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPromotionFundingRoutesRegistered(t *testing.T) {
	t.Parallel()

	router := NewRouter(nil, true)
	tests := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodPost, "/wlt/promotion-funding/reservations", "POST /wlt/promotion-funding/reservations"},
		{http.MethodGet, "/wlt/promotion-funding/reservations/pfr_123", "GET /wlt/promotion-funding/reservations/{reservationId}"},
		{http.MethodPost, "/wlt/promotion-funding/reservations/pfr_123/commit", "POST /wlt/promotion-funding/reservations/{reservationId}/commit"},
		{http.MethodPost, "/wlt/promotion-funding/reservations/pfr_123/release", "POST /wlt/promotion-funding/reservations/{reservationId}/release"},
		{http.MethodPost, "/wlt/promotion-funding/reservations/pfr_123/reverse", "POST /wlt/promotion-funding/reservations/{reservationId}/reverse"},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			request := httptest.NewRequest(tt.method, tt.path, nil)
			_, pattern := router.Handler(request)
			if pattern != tt.pattern {
				t.Fatalf("route %s %s resolved to %q, want %q", tt.method, tt.path, pattern, tt.pattern)
			}
		})
	}
}
