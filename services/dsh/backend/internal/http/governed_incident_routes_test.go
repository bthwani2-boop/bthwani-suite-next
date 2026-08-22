package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRegisterGovernedIncidentRoutesRegistersCanonicalContract(t *testing.T) {
	mux := http.NewServeMux()
	RegisterGovernedIncidentRoutes(mux, nil, nil, nil, nil)

	routes := []struct {
		method string
		path   string
	}{
		{method: http.MethodGet, path: "/dsh/operator/support/incidents"},
		{method: http.MethodPost, path: "/dsh/operator/support/incidents"},
		{method: http.MethodGet, path: "/dsh/operator/support/incidents/incident-1"},
		{method: http.MethodPatch, path: "/dsh/operator/support/incidents/incident-1"},
		{method: http.MethodGet, path: "/dsh/operator/support/incidents/incident-1/events"},
	}
	for _, route := range routes {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			_, pattern := mux.Handler(httptest.NewRequest(route.method, route.path, nil))
			if pattern == "" {
				t.Fatalf("expected canonical governed incident route to be registered: %s %s", route.method, route.path)
			}
		})
	}

	unsupported := []struct {
		method string
		path   string
	}{
		{method: http.MethodPut, path: "/dsh/operator/support/incidents"},
		{method: http.MethodDelete, path: "/dsh/operator/support/incidents/incident-1"},
		{method: http.MethodPost, path: "/dsh/operator/support/incidents/incident-1/events"},
		{method: http.MethodGet, path: "/dsh/operator/incidents"},
		{method: http.MethodPost, path: "/dsh/operator/incidents"},
		{method: http.MethodPatch, path: "/dsh/operator/incidents/incident-1"},
	}
	for _, route := range unsupported {
		_, pattern := mux.Handler(httptest.NewRequest(route.method, route.path, nil))
		if pattern != "" {
			t.Fatalf("unexpected governed incident registration for %s %s: %s", route.method, route.path, pattern)
		}
	}
}
