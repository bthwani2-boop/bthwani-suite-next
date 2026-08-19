package http

import "testing"

func TestWorkforceKindForCollection(t *testing.T) {
	tests := []struct {
		collection string
		role       string
		ok         bool
	}{
		{collection: "field-agents", role: "field", ok: true},
		{collection: "captains", role: "captain", ok: true},
		{collection: "employees", role: "employee", ok: true},
		{collection: "orders", ok: false},
		{collection: "", ok: false},
	}
	for _, test := range tests {
		t.Run(test.collection, func(t *testing.T) {
			role, ok := workforceKindForCollection(test.collection)
			if ok != test.ok || role != test.role {
				t.Fatalf("workforceKindForCollection(%q)=(%q,%v), want (%q,%v)", test.collection, role, ok, test.role, test.ok)
			}
		})
	}
}
