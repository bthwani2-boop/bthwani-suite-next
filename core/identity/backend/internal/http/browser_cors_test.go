package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestBrowserCorsMiddlewareAllowsGovernedDeletePreflight(t *testing.T) {
	t.Setenv("IDENTITY_CORS_ALLOWED_ORIGINS", "https://control-panel.example.com")

	nextCalled := false
	handler := BrowserCorsMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))

	request := httptest.NewRequest(http.MethodOptions, "/auth/sessions/session-1", nil)
	request.Header.Set("Origin", "https://control-panel.example.com")
	request.Header.Set("Access-Control-Request-Method", http.MethodDelete)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected 204 preflight, got %d", response.Code)
	}
	if nextCalled {
		t.Fatal("preflight must not reach the protected identity router")
	}
	methods := response.Header().Get("Access-Control-Allow-Methods")
	if !strings.Contains(methods, http.MethodDelete) {
		t.Fatalf("DELETE is missing from governed browser methods: %q", methods)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "https://control-panel.example.com" {
		t.Fatalf("unexpected allowed origin %q", got)
	}
}

func TestBrowserCorsMiddlewareRejectsUnknownOrigin(t *testing.T) {
	t.Setenv("IDENTITY_CORS_ALLOWED_ORIGINS", "https://control-panel.example.com")
	handler := BrowserCorsMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		t.Fatal("preflight must not reach next handler")
	}))

	request := httptest.NewRequest(http.MethodOptions, "/auth/account", nil)
	request.Header.Set("Origin", "https://untrusted.example.com")
	request.Header.Set("Access-Control-Request-Method", http.MethodDelete)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("expected 204 preflight, got %d", response.Code)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("untrusted origin was allowed: %q", got)
	}
}
