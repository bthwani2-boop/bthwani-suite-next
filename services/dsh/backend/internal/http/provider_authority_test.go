package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRetiredDshProviderRoutesAreUnavailable(t *testing.T) {
	router := NewRouter(nil, nil, nil, nil, nil, nil)
	paths := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/dsh/operator/platform/providers"},
		{http.MethodPost, "/dsh/operator/platform/providers/retired/status"},
	}

	for _, route := range paths {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			request := httptest.NewRequest(route.method, route.path, nil)
			response := httptest.NewRecorder()
			router.ServeHTTP(response, request)
			if response.Code != http.StatusNotFound {
				t.Fatalf("retired DSH provider route returned %d, want 404", response.Code)
			}
		})
	}
}
