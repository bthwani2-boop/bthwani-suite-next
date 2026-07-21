package http

import (
	"net/http"
	"net/http/httptest"
	"reflect"
	"testing"
)

func TestJRN003WorkforceScopeRoutesAreMounted(t *testing.T) {
	mux := http.NewServeMux()
	RegisterWorkforceScopeRoutes(mux, nil, nil, nil, nil)
	RegisterWorkforceEmployeeMediaRoute(mux, nil, nil, nil, nil)

	cases := []struct {
		method  string
		path    string
		pattern string
	}{
		{http.MethodGet, "/dsh/operator/workforce/scopes/field-1?actorRole=field", "GET /dsh/operator/workforce/scopes/{actorId}"},
		{http.MethodPut, "/dsh/operator/workforce/scopes/field-1", "PUT /dsh/operator/workforce/scopes/{actorId}"},
		{http.MethodPost, "/dsh/operator/workforce/employees/employee-1/media/uploads", "POST /dsh/operator/workforce/employees/{actorId}/media/uploads"},
	}
	for _, tc := range cases {
		req := httptest.NewRequest(tc.method, tc.path, nil)
		_, pattern := mux.Handler(req)
		if pattern != tc.pattern {
			t.Fatalf("expected %q, got %q", tc.pattern, pattern)
		}
	}
}

func TestJRN003ScopeValuesAreNormalized(t *testing.T) {
	got := normalizedScopeValues([]string{" store-2 ", "store-1", "", "store-2"})
	want := []string{"store-1", "store-2"}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("expected %#v, got %#v", want, got)
	}
}
