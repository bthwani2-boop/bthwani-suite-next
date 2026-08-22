package mapproviders

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestHealthReturnsOnlyMapProviderState(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/providers/health" {
			t.Fatalf("path = %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(providerHealthResponse{Providers: []HealthItem{
			{Kind: "sms", Status: "healthy", CheckedAt: time.Now().UTC()},
			{Kind: "maps", Status: "degraded", CheckedAt: time.Now().UTC(), Message: "secondary provider active"},
		}})
	}))
	defer server.Close()

	snapshot, err := NewClient(server.URL).Health(context.Background(), "Bearer operator")
	if err != nil {
		t.Fatalf("Health() error = %v", err)
	}
	if !snapshot.Configured || snapshot.Status != "degraded" || len(snapshot.Providers) != 1 || snapshot.Providers[0].Kind != "maps" {
		t.Fatalf("unexpected health snapshot: %+v", snapshot)
	}
}

func TestProviderTimeoutIsClassifiedSeparately(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(50 * time.Millisecond)
		_ = json.NewEncoder(w).Encode(SearchResponse{Locations: []Location{}})
	}))
	defer server.Close()

	_, err := NewClientWithTimeout(server.URL, 5*time.Millisecond).Search(context.Background(), "Bearer client", SearchInput{Query: "صنعاء"})
	if !errors.Is(err, ErrTimeout) {
		t.Fatalf("Search() error = %v, want ErrTimeout", err)
	}
}

func TestHealthFailsClosedWhenRuntimeIsNotConfigured(t *testing.T) {
	snapshot, err := NewClient("").Health(context.Background(), "")
	if !errors.Is(err, ErrNotConfigured) || snapshot.Configured || snapshot.Status != "not_configured" {
		t.Fatalf("snapshot=%+v error=%v", snapshot, err)
	}
}
