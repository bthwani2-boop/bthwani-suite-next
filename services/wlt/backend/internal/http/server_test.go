package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestMutationRoutesDisabledByDefault(t *testing.T) {
	router := NewRouter(nil, false, nil)

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
		{http.MethodPost, "/wlt/commissions"},
		{http.MethodPost, "/wlt/delivery-collections"},
		{http.MethodPost, "/wlt/order-cancellations"},
		{http.MethodPost, "/wlt/field-commissions"},
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

func TestRetiredLedgerMutationRouteIsNotRegistered(t *testing.T) {
	for _, mutationsEnabled := range []bool{false, true} {
		router := NewRouter(nil, mutationsEnabled, nil)
		req := httptest.NewRequest(http.MethodPost, "/wlt/ledger/entries", nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusNotFound {
			t.Fatalf("mutationsEnabled=%t: retired POST /wlt/ledger/entries must return 404, got %d", mutationsEnabled, rec.Code)
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
	router := NewRouter(nil, false, nil)

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

// TestMutationRoutesRequireServiceAuth checks that once mutations are
// enabled, every financial-mutation route still rejects a caller that has
// no valid X-Service-Caller/Authorization credentials -- the mutation gate
// (WLT_MUTATIONS_ENABLED) is not itself authentication.
// concreteRoute turns a registered pattern such as
// "POST /wlt/payout-requests/{payoutId}/approve" into a method and a
// requestable path. Iterating the real route table, rather than a hand-written
// list, is what makes these gate assertions exhaustive: a new mutation route
// is covered the moment it is registered.
func concreteRoute(pattern string) (string, string) {
	method, rawPath, found := strings.Cut(pattern, " ")
	if !found {
		return http.MethodGet, pattern
	}
	segments := strings.Split(rawPath, "/")
	for i, segment := range segments {
		if strings.HasPrefix(segment, "{") && strings.HasSuffix(segment, "}") {
			segments[i] = "gate-probe-id"
		}
	}
	return method, strings.Join(segments, "/")
}

func TestMutationRoutesRequireServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	t.Setenv("WLT_WORKFORCE_SERVICE_TOKEN", "test-workforce-service-token")
	router, routes := newRouterWithRoutes(nil, true, nil)

	checked := 0
	for _, route := range routes {
		if route.Kind != routeMutation || !route.ServiceAuth {
			continue
		}
		method, path := concreteRoute(route.Pattern)
		req := httptest.NewRequest(method, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("%s: expected 401 (no service auth), got %d", route.Pattern, rec.Code)
		}
		checked++
	}
	if checked == 0 {
		t.Fatal("no mutation routes were checked; the route table is not being populated")
	}
}

// TestEveryFinancialMutationIsKillSwitchGated proves the finance kill switch
// covers the whole mutation surface. It previously reached only 17 of roughly
// a hundred mutation routes, so settlements, COD, commissions, penalties,
// payout destinations, reconciliation, commercial and promotion funding could
// all still move money while the switch was engaged.
func TestEveryFinancialMutationIsKillSwitchGated(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	t.Setenv("WLT_WORKFORCE_SERVICE_TOKEN", "test-workforce-service-token")
	router, routes := newRouterWithRoutes(nil, true, killedDecisionService{})

	checked := 0
	for _, route := range routes {
		if route.Kind != routeMutation {
			continue
		}
		method, path := concreteRoute(route.Pattern)
		req := httptest.NewRequest(method, path, nil)
		if route.ServiceAuth {
			// Authenticate and supply the delegated financial scope so the
			// request reaches the kill-switch gate instead of stopping at the
			// authentication or operator-context checks in front of it.
			req.Header.Set("X-Service-Caller", "dsh")
			req.Header.Set("Authorization", "Bearer test-dsh-service-token")
			if strings.Contains(path, "provider-penalties") {
				req.Header.Set("X-Service-Caller", "workforce")
				req.Header.Set("Authorization", "Bearer test-workforce-service-token")
			}
			req.Header.Set("X-Operator-Context-ID", "kill-switch-probe-context")
		}
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden || !strings.Contains(rec.Body.String(), "KILL_SWITCH_ACTIVE") {
			t.Fatalf("%s: expected 403 KILL_SWITCH_ACTIVE, got %d %s", route.Pattern, rec.Code, rec.Body.String())
		}
		checked++
	}
	if checked == 0 {
		t.Fatal("no mutation routes were checked; the route table is not being populated")
	}
}

// TestNoWriteRouteEscapesTheMutationClassification catches a route registered
// with read() or public() that actually mutates financial state.
func TestNoWriteRouteEscapesTheMutationClassification(t *testing.T) {
	_, routes := newRouterWithRoutes(nil, true, nil)
	for _, route := range routes {
		method, _ := concreteRoute(route.Pattern)
		switch method {
		case http.MethodGet, http.MethodHead:
			continue
		}
		if route.Kind != routeMutation {
			t.Fatalf("%s is a write route but is not registered as a mutation", route.Pattern)
		}
	}
}

type killedDecisionService struct{}

func (killedDecisionService) IsCapabilityKilled(context.Context, string, string) (bool, error) {
	return true, nil
}

func TestFinancialReadRoutesRequireInternalServiceAuth(t *testing.T) {
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")
	router := NewRouter(nil, true, nil)

	readRoutes := []string{
		"/wlt/refunds",
		"/wlt/settlements/summary",
		"/wlt/settlements",
		"/wlt/cod-records",
		"/wlt/commissions",
		"/wlt/ledger/entries",
	}

	for _, path := range readRoutes {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		rec := httptest.NewRecorder()
		router.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Fatalf("GET %s: expected 401 service auth gate, got %d", path, rec.Code)
		}
	}
}
