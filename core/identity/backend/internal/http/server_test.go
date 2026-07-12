package http

import (
	"net/http/httptest"
	"os"
	"testing"
)

func TestClientIPPrefersForwardedFor(t *testing.T) {
	req := httptest.NewRequest("POST", "/auth/login", nil)
	req.Header.Set("X-Forwarded-For", "203.0.113.5, 10.0.0.1")
	req.RemoteAddr = "10.0.0.1:54321"

	if got := clientIP(req); got != "203.0.113.5" {
		t.Fatalf("expected first forwarded IP, got %q", got)
	}
}

func TestClientIPFallsBackToRemoteAddr(t *testing.T) {
	req := httptest.NewRequest("POST", "/auth/login", nil)
	req.RemoteAddr = "198.51.100.7:9443"

	if got := clientIP(req); got != "198.51.100.7" {
		t.Fatalf("expected remote addr host, got %q", got)
	}
}

func TestAllowedCorsOriginsDefaultsToLocalDev(t *testing.T) {
	t.Setenv("IDENTITY_CORS_ALLOWED_ORIGINS", "")
	os.Unsetenv("IDENTITY_CORS_ALLOWED_ORIGINS")

	allowed := allowedCorsOrigins()
	if !allowed["http://localhost:13000"] {
		t.Fatal("expected local dev origin to be allowed by default")
	}
	if allowed["https://evil.example.com"] {
		t.Fatal("unexpected origin allowed by default")
	}
}

func TestAllowedCorsOriginsReadsEnvAllowlist(t *testing.T) {
	t.Setenv("IDENTITY_CORS_ALLOWED_ORIGINS", "https://control-panel.example.com, https://admin.example.com")

	allowed := allowedCorsOrigins()
	if !allowed["https://control-panel.example.com"] || !allowed["https://admin.example.com"] {
		t.Fatalf("expected configured origins to be allowed, got %#v", allowed)
	}
	if allowed["http://localhost:13000"] {
		t.Fatal("local dev origin must not be implicitly allowed once env is configured")
	}
}
