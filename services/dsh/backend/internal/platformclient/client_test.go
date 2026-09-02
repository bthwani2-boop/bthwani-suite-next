package platformclient

import (
	"context"
	"dsh-api/internal/opctx"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestGetVariableUsesTrustedInternalPlatformRoute(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/platform/internal/v1/variables/VAR_PARTNER_COMMERCIAL_MODEL" {
			t.Fatalf("unexpected platform route: %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer service-token" || r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("missing trusted service authentication: auth=%q caller=%q", r.Header.Get("Authorization"), r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Operator-Context-ID") != "operator-context-1" {
			t.Fatalf("missing trusted operator context: %q", r.Header.Get("X-Operator-Context-ID"))
		}
		_ = json.NewEncoder(w).Encode(map[string]any{"variable": PlatformVariable{Key: "VAR_PARTNER_COMMERCIAL_MODEL", ValueJSON: "commission", EffectiveFrom: "2026-01-01T00:00:00Z"}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-token")
	variable, err := client.GetVariable(opctx.WithOperatorContext(context.Background(), "operator-context-1"), "VAR_PARTNER_COMMERCIAL_MODEL", "partner", "partner-1")
	if err != nil {
		t.Fatalf("GetVariable failed: %v", err)
	}
	if variable == nil || variable.ValueJSON != "commission" {
		t.Fatalf("unexpected variable response: %#v", variable)
	}
}

func TestGetVariableFailsClosedWithoutTrustedOperatorContext(t *testing.T) {
	client := NewClient("http://127.0.0.1:1", "service-token")
	if _, err := client.GetVariable(context.Background(), "VAR_PARTNER_COMMERCIAL_MODEL", "partner", "partner-1"); err == nil {
		t.Fatal("expected missing trusted operator context to fail closed")
	}
}
