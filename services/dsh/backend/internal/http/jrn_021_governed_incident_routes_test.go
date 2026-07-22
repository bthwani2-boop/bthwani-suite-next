package http

import "testing"

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
