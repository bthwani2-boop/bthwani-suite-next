package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJRN021GovernedIncidentRouteOwnership(t *testing.T) {
	cases := []struct {
		path       string
		collection bool
		incidentID string
		events     bool
	}{
		{path: "/dsh/operator/incidents", collection: true},
		{path: "/dsh/operator/support/incidents", collection: true},
		{path: "/dsh/operator/incidents/incident-1", incidentID: "incident-1"},
		{path: "/dsh/operator/support/incidents/incident-1", incidentID: "incident-1"},
		{path: "/dsh/operator/incidents/incident-1/events", incidentID: "incident-1", events: true},
		{path: "/dsh/operator/support/incidents/incident-1/events", incidentID: "incident-1", events: true},
	}
	for _, tc := range cases {
		match, ok := matchGovernedIncidentRoute(tc.path)
		if !ok {
			t.Fatalf("expected %q to be owned by governed incident runtime", tc.path)
		}
		if match.Collection != tc.collection || match.IncidentID != tc.incidentID || match.Events != tc.events {
			t.Fatalf("unexpected match for %q: %#v", tc.path, match)
		}
	}

	if _, ok := matchGovernedIncidentRoute("/dsh/operator/support/tickets"); ok {
		t.Fatal("support ticket path must not be captured by incident middleware")
	}
}

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
	}
	for _, route := range unsupported {
		_, pattern := mux.Handler(httptest.NewRequest(route.method, route.path, nil))
		if pattern != "" {
			t.Fatalf("unexpected governed incident registration for %s %s: %s", route.method, route.path, pattern)
		}
	}
}
