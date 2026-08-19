package providers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
)

func TestMapEndpointRequiresExplicitOutboundAllowlist(t *testing.T) {
	t.Setenv("PROVIDERS_OUTBOUND_ALLOWED_HOSTS", "")
	if _, err := mapEndpoint("https://maps.example.com", "/search"); err == nil || !strings.Contains(err.Error(), "not allowlisted") {
		t.Fatalf("expected unallowlisted map provider to fail closed, got %v", err)
	}

	t.Setenv("PROVIDERS_OUTBOUND_ALLOWED_HOSTS", "maps.example.com")
	endpoint, err := mapEndpoint("https://maps.example.com/api", "/search")
	if err != nil {
		t.Fatalf("allowlisted map provider was rejected: %v", err)
	}
	if endpoint.Hostname() != "maps.example.com" || endpoint.Path != "/api/search" {
		t.Fatalf("unexpected governed endpoint: %s", endpoint.String())
	}
}

func TestMapEndpointRejectsEmbeddedCredentials(t *testing.T) {
	t.Setenv("PROVIDERS_OUTBOUND_ALLOWED_HOSTS", "maps.example.com")
	if _, err := mapEndpoint("https://user:secret@maps.example.com", "/search"); err == nil {
		t.Fatal("expected provider URL credentials to be rejected")
	}
}

func TestMapExecutionNeverFollowsProviderRedirect(t *testing.T) {
	var targetHits atomic.Int32
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		targetHits.Add(1)
		if r.Header.Get("X-Api-Key") != "" {
			t.Fatal("provider credential reached redirect target")
		}
		_ = json.NewEncoder(w).Encode(map[string]string{"status": "unexpected"})
	}))
	defer target.Close()

	redirect := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, target.URL, http.StatusTemporaryRedirect)
	}))
	defer redirect.Close()

	var response map[string]string
	err := executeMapJSON(
		context.Background(),
		"maps-test",
		redirect.URL,
		mapProviderParameters{UserAgent: "bthwani-provider-test", TimeoutMS: 1000},
		mapProviderCredentials{APIKey: "secret", APIKeyHeader: "X-Api-Key"},
		&response,
	)
	if err == nil || !strings.Contains(err.Error(), "status 307") {
		t.Fatalf("expected redirect to be rejected, got %v", err)
	}
	if targetHits.Load() != 0 {
		t.Fatalf("redirect target was contacted %d times", targetHits.Load())
	}
}
