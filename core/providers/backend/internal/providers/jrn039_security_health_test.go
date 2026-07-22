package providers

import (
	"context"
	"encoding/json"
	"errors"
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

func TestProviderForReadSanitizesLegacySecretParameters(t *testing.T) {
	provider := ExternalProvider{
		ProviderID: "provider-legacy",
		Kind:       "email",
		Code:       "legacy-email",
		Parameters: json.RawMessage(`{
			"environment":"production",
			"nested":{"refreshToken":"legacy-secret","region":"me"},
			"healthUrl":"https://status.example.com/health?apiKey=legacy-secret#debug"
		}`),
	}

	encoded, err := json.Marshal(providerForRead(provider))
	if err != nil {
		t.Fatalf("marshal provider: %v", err)
	}
	body := string(encoded)
	if strings.Contains(body, "legacy-secret") || strings.Contains(body, "refreshToken") || strings.Contains(body, "apiKey") || strings.Contains(body, "#debug") {
		t.Fatalf("provider response leaked legacy secret parameters: %s", body)
	}
	if !strings.Contains(body, `"region":"me"`) || !strings.Contains(body, `"healthUrl":"https://status.example.com/health"`) {
		t.Fatalf("provider response removed safe public parameters: %s", body)
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

func TestProviderHealthRejectsSecretBearingURL(t *testing.T) {
	service := NewService(nil)
	service.allowedHealthHosts = map[string]struct{}{"example.com": {}}
	provider := ExternalProvider{
		ProviderID: "provider-1",
		Kind:       "storage",
		Code:       "storage-primary",
		Active:     true,
		Parameters: json.RawMessage(`{"healthUrl":"https://example.com/health?token=secret"}`),
	}

	status, _ := service.probeProviderHealth(context.Background(), provider)
	if status != StatusDegraded {
		t.Fatalf("expected degraded status for secret-bearing probe URL, got %s", status)
	}
}

func TestProviderUpdateRequiresAtLeastOneField(t *testing.T) {
	if err := validateUpdateProviderInput(UpdateProviderInput{}); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected empty provider update to be rejected, got %v", err)
	}
}

func TestProviderUpdateRejectsSecretMaterialInParameters(t *testing.T) {
	parameters := json.RawMessage(`{"environment":"production","nested":{"apiKey":"must-not-be-public"}}`)
	input := UpdateProviderInput{Parameters: &parameters}
	if err := validateUpdateProviderInput(input); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected secret-like parameter to be rejected, got %v", err)
	}
}

func TestProviderUpdateRejectsSecretBearingHealthURL(t *testing.T) {
	parameters := json.RawMessage(`{"healthUrl":"https://status.example.com/health?token=must-not-be-public"}`)
	input := UpdateProviderInput{Parameters: &parameters}
	if err := validateUpdateProviderInput(input); !errors.Is(err, ErrInvalidInput) {
		t.Fatalf("expected health URL query secret to be rejected, got %v", err)
	}
}

func TestProviderUpdateAcceptsWriteOnlyCredentialsAndPublicParameters(t *testing.T) {
	credentials := json.RawMessage(`{"apiKey":"write-only-secret"}`)
	parameters := json.RawMessage(`{"environment":"production","healthUrl":"https://status.example.com/health"}`)
	active := true
	input := UpdateProviderInput{
		Active:      &active,
		Credentials: &credentials,
		Parameters:  &parameters,
	}
	if err := validateUpdateProviderInput(input); err != nil {
		t.Fatalf("expected governed provider update to be valid, got %v", err)
	}
}
