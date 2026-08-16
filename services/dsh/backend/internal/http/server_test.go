package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCorsAllowsPutForRuntimeEndpoints(t *testing.T) {
	handler := CorsMiddleware("local", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodOptions, "/dsh/notifications/preferences", nil)
	req.Header.Set("Origin", "http://localhost:13000")
	res := httptest.NewRecorder()

	handler.ServeHTTP(res, req)

	allowed := res.Header().Get("Access-Control-Allow-Methods")
	if !strings.Contains(allowed, "PUT") {
		t.Fatalf("expected CORS methods to include PUT, got %q", allowed)
	}
}

func TestDshActorSurfaceUsesDatabaseAllowedValues(t *testing.T) {
	cases := map[string]string{
		"operator": "control-panel",
		"partner":  "app-partner",
		"field":    "app-field",
		"captain":  "app-captain",
		"system":   "system",
	}

	for role, want := range cases {
		if got := dshActorSurface(role); got != want {
			t.Fatalf("dshActorSurface(%q) = %q, want %q", role, got, want)
		}
	}
}

func TestRetiredDshChangeSetRoutesAreUnavailable(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, nil)
	paths := []struct {
		method string
		path   string
	}{
		{http.MethodPost, "/dsh/operator/platform/change-sets"},
		{http.MethodGet, "/dsh/operator/platform/change-sets/retired"},
		{http.MethodPost, "/dsh/operator/platform/change-sets/retired/submit"},
		{http.MethodPost, "/dsh/operator/platform/change-sets/retired/approve"},
		{http.MethodPost, "/dsh/operator/platform/change-sets/retired/apply"},
		{http.MethodPost, "/dsh/operator/platform/change-sets/retired/reject"},
	}

	for _, route := range paths {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			request := httptest.NewRequest(route.method, route.path, nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusNotFound {
				t.Fatalf("retired DSH change-set route returned %d, want 404", response.Code)
			}
		})
	}
}
