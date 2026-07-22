package http

import "testing"

func TestJRN003ProviderDocumentPathParsing(t *testing.T) {
	cases := []struct {
		path    string
		kind    string
		actorID string
		ok      bool
	}{
		{"/workforce/field-agents/field-1/documents", "field", "field-1", true},
		{"/workforce/captains/captain-1/documents", "captain", "captain-1", true},
		{"/workforce/employees/employee-1/documents", "employee", "employee-1", true},
		{"/workforce/unknown/x/documents", "", "", false},
		{"/workforce/captains//documents", "captain", "", false},
	}
	for _, tc := range cases {
		kind, actorID, ok := parseProviderDocumentPath(tc.path)
		if kind != tc.kind || actorID != tc.actorID || ok != tc.ok {
			t.Fatalf("path %q: expected (%q,%q,%v), got (%q,%q,%v)", tc.path, tc.kind, tc.actorID, tc.ok, kind, actorID, ok)
		}
	}
}
