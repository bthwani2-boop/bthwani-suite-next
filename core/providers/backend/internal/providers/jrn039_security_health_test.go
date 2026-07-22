package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestProviderForReadNeverSerializesCredentials(t *testing.T) {
	provider := ExternalProvider{
		ProviderID:  "provider-1",
		Kind:        "sms",
		Code:        "sms-primary",
		Active:      true,
		Credentials: json.RawMessage(`{"apiKey":"top-secret"}`),
		Parameters:  json.RawMessage(`{"environment":"production"}`),
		UpdatedAt:   time.Now().UTC(),
	}

	encoded, err := json.Marshal(providerForRead(provider))
	if err != nil {
		t.Fatalf("marshal provider: %v", err)
	}
	body := string(encoded)
	if strings.Contains(body, "top-secret") || strings.Contains(body, "credentials") {
		t.Fatalf("provider response leaked credentials: %s", body)
	}
	if !strings.Contains(body, `"credentialConfigured":true`) {
		t.Fatalf("provider response must expose only credential presence: %s", body)
	}
}

func TestProviderHealthRequiresAllowlistedLiveProbe(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "" {
			t.Fatal("health probes must not forward authorization")
		}
		w.WriteHeader(http.StatusNoContent)
	}))
	defer server.Close()

	parsed, err := url.Parse(server.URL)
	if err != nil {
		t.Fatalf("parse test server URL: %v", err)
	}
	service := NewService(nil)
	service.allowedHealthHosts = map[string]struct{}{parsed.Hostname(): {}}
	service.healthClient = server.Client()
	provider := ExternalProvider{
		ProviderID: "provider-1",
		Kind:       "maps",
		Code:       "maps-primary",
		Active:     true,
		Parameters: json.RawMessage(`{"healthUrl":"` + server.URL + `"}`),
	}

	status, message := service.probeProviderHealth(context.Background(), provider)
	if status != StatusHealthy {
		t.Fatalf("expected healthy provider, got %s (%s)", status, message)
	}
}

func TestProviderHealthRejectsUnallowlistedHost(t *testing.T) {
	service := NewService(nil)
	provider := ExternalProvider{
		ProviderID: "provider-1",
		Kind:       "payment",
		Code:       "payment-primary",
		Active:     true,
		Parameters: json.RawMessage(`{"healthUrl":"https://example.com/health"}`),
	}

	status, _ := service.probeProviderHealth(context.Background(), provider)
	if status != StatusDegraded {
		t.Fatalf("expected degraded status for unallowlisted host, got %s", status)
	}
}
