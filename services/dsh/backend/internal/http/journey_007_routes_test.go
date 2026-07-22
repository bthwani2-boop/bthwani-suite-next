package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJourney007ExposesHomeMarketingEventRoute(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil)
	req := httptest.NewRequest(http.MethodPost, "/dsh/home-discovery/events", strings.NewReader("{"))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()
	router.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected registered route to validate payload with 400, got %d", res.Code)
	}
}
