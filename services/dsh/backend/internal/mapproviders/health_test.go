package mapproviders

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"dsh-api/internal/providers"
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

func TestClientLifecycleSharesBreakerAcrossRequestsAndRecovers(t *testing.T) {
	var requests int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		if requests <= 5 {
			w.WriteHeader(http.StatusBadGateway)
			return
		}
		_ = json.NewEncoder(w).Encode(SearchResponse{Locations: []Location{}})
	}))
	defer server.Close()

	client := NewClientWithTimeout(server.URL, time.Second)
	client.breaker = providers.NewCircuitBreaker(providers.CircuitBreakerConfig{
		FailureThreshold: 5,
		SuccessThreshold: 2,
		Timeout:          time.Millisecond,
	})
	for attempt := 0; attempt < 5; attempt++ {
		_, err := client.Search(context.Background(), "Bearer client", SearchInput{Query: "صنعاء"})
		if !errors.Is(err, ErrUnavailable) {
			t.Fatalf("failure %d: error = %v, want ErrUnavailable", attempt+1, err)
		}
	}
	if got := client.breaker.State(); got != "OPEN" {
		t.Fatalf("breaker state after threshold = %s, want OPEN", got)
	}
	_, err := client.Search(context.Background(), "Bearer client", SearchInput{Query: "صنعاء"})
	if !errors.Is(err, ErrUnavailable) || requests != 5 {
		t.Fatalf("open breaker request: error=%v requests=%d, want unavailable and no upstream call", err, requests)
	}

	time.Sleep(2 * time.Millisecond)
	for attempt := 0; attempt < 2; attempt++ {
		_, err := client.Search(context.Background(), "Bearer client", SearchInput{Query: "صنعاء"})
		if err != nil {
			t.Fatalf("half-open recovery %d: error = %v", attempt+1, err)
		}
	}
	if got := client.breaker.State(); got != "CLOSED" {
		t.Fatalf("breaker state after recovery = %s, want CLOSED", got)
	}
	if requests != 7 {
		t.Fatalf("upstream requests = %d, want 7 (5 failures + 2 recovery probes)", requests)
	}
}

func TestClientHonorsContextCancellation(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		time.Sleep(100 * time.Millisecond)
		_ = json.NewEncoder(w).Encode(SearchResponse{Locations: []Location{}})
	}))
	defer server.Close()

	client := NewClient(server.URL)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_, err := client.Search(ctx, "Bearer client", SearchInput{Query: "صنعاء"})
	if !errors.Is(err, ErrUnavailable) {
		t.Fatalf("cancelled Search() error = %v, want classified provider failure", err)
	}
	if client.http.Timeout <= 0 {
		t.Fatal("NewClient() created an unbounded HTTP client")
	}
}
