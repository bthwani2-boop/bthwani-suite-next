package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProviderHealthIsForwardedToTheProviderHealthRoute(t *testing.T) {
	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		called = true
		w.WriteHeader(http.StatusTeapot)
	})

	request := httptest.NewRequest(http.MethodGet, "/providers/health", nil)
	response := httptest.NewRecorder()
	RuntimeReadinessBoundary(next, nil).ServeHTTP(response, request)

	if !called {
		t.Fatal("provider health was intercepted by the runtime readiness boundary")
	}
	if response.Code != http.StatusTeapot {
		t.Fatalf("provider health response code = %d, want %d", response.Code, http.StatusTeapot)
	}
}
