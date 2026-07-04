package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestMutationRoutesDisabledByDefault(t *testing.T) {
	router := NewRouter(nil, false)

	gatedRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/wlt/payment-sessions/ps-1/authorize"},
		{http.MethodPost, "/wlt/payment-sessions/ps-1/capture"},
		{http.MethodPost, "/wlt/payment-sessions/ps-1/expire"},
		{http.MethodPost, "/wlt/payment-sessions/ps-1/cod-collect"},
		{http.MethodPost, "/wlt/refunds"},
		{http.MethodPost, "/wlt/refunds/r-1/approve"},
		{http.MethodPost, "/wlt/refunds/r-1/complete"},
		{http.MethodPost, "/wlt/refunds/r-1/reject"},
		{http.MethodPost, "/wlt/settlements"},
		{http.MethodPost, "/wlt/settlements/s-1/post"},
		{http.MethodPost, "/wlt/cod-records/c-1/collect"},
		{http.MethodPost, "/wlt/cod-records/c-1/remit"},
		{http.MethodPost, "/wlt/ledger/entries"},
	}

	for _, route := range gatedRoutes {
		req := httptest.NewRequest(route.method, route.path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Fatalf("%s %s: expected 403 FEATURE_NOT_ENABLED, got %d", route.method, route.path, rec.Code)
		}
	}
}

// TestReadRoutesStillWorkWhenMutationsDisabled checks that non-mutation
// routes are not rejected by the mutation gate itself. It only exercises
// /wlt/health (no DB dependency); the other read routes proxy straight to
// their handlers with no db.DB available in this unit test, so asserting
// "not gated" for them would require a real database connection -- that is
// covered by the wlt-go-db CI job instead, not here.
func TestReadRoutesStillWorkWhenMutationsDisabled(t *testing.T) {
	router := NewRouter(nil, false)

	req := httptest.NewRequest(http.MethodGet, "/wlt/health", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code == http.StatusForbidden {
		t.Fatalf("/wlt/health: read route must not be gated, got 403")
	}
	if rec.Code != http.StatusOK {
		t.Fatalf("/wlt/health: expected 200, got %d", rec.Code)
	}
}
