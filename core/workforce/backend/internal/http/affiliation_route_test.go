package http

import "testing"

func TestParseProviderAffiliationPath(t *testing.T) {
	tests := []struct {
		path    string
		role    string
		actorID string
		ok      bool
	}{
		{path: "/workforce/field-agents/field-1/affiliations", role: "field", actorID: "field-1", ok: true},
		{path: "/workforce/captains/captain-1/affiliations", role: "captain", actorID: "captain-1", ok: true},
		{path: "/workforce/employees/employee-1/affiliations", role: "employee", actorID: "employee-1", ok: true},
		{path: "/workforce/captains/captain-1/assignments", ok: false},
		{path: "/workforce/orders/order-1/affiliations", ok: false},
		{path: "/workforce/captains//affiliations", ok: false},
	}
	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			role, actorID, ok := parseProviderAffiliationPath(test.path)
			if ok != test.ok || role != test.role || actorID != test.actorID {
				t.Fatalf("parseProviderAffiliationPath(%q)=(%q,%q,%v), want (%q,%q,%v)", test.path, role, actorID, ok, test.role, test.actorID, test.ok)
			}
		})
	}
}
