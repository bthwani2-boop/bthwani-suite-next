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
