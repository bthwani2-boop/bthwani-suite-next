package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestProvidersIdentityClientFailsClosedOnMalformedIdentityResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"subject":`))
	}))
	defer server.Close()

	_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
	if !errors.Is(err, ErrIdentityUnavailable) {
		t.Fatalf("malformed identity response error = %v, want ErrIdentityUnavailable", err)
	}
}

func TestProvidersIdentityClientFailsClosedOnIdentityOutage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
	if !errors.Is(err, ErrIdentityUnavailable) {
		t.Fatalf("identity outage error = %v, want ErrIdentityUnavailable", err)
	}
}

func TestProvidersIdentityClientRejectsUntrustedIdentityResponses(t *testing.T) {
	tests := []struct {
		name   string
		status int
		body   string
	}{
		{name: "unauthorized", status: http.StatusUnauthorized, body: `{}`},
		{name: "forbidden", status: http.StatusForbidden, body: `{}`},
		{name: "subjectless", status: http.StatusOK, body: `{"authState":"authenticated","operatorContextId":"context-main"}`},
		{name: "contextless", status: http.StatusOK, body: `{"authState":"authenticated","subject":"actor-1"}`},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(test.status)
				_, _ = w.Write([]byte(test.body))
			}))
			defer server.Close()

			_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
			if !errors.Is(err, ErrUnauthenticated) {
				t.Fatalf("untrusted identity error = %v, want ErrUnauthenticated", err)
			}
		})
	}
}
