package auth

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPlatformControlIdentityClientFailsClosedOnMalformedIdentityResponse(t *testing.T) {
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

func TestPlatformControlIdentityClientFailsClosedOnIdentityOutage(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
	if !errors.Is(err, ErrIdentityUnavailable) {
		t.Fatalf("identity outage error = %v, want ErrIdentityUnavailable", err)
	}
}

func TestPlatformControlIdentityClientRejectsUnauthenticatedAndSubjectlessResponses(t *testing.T) {
	t.Run("unauthorized", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusUnauthorized)
		}))
		defer server.Close()

		_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
		if !errors.Is(err, ErrUnauthenticated) {
			t.Fatalf("unauthorized error = %v, want ErrUnauthenticated", err)
		}
	})

	t.Run("subjectless", func(t *testing.T) {
		server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Content-Type", "application/json")
			_, _ = w.Write([]byte(`{"authState":"authenticated","operatorContextId":"context-main"}`))
		}))
		defer server.Close()

		_, err := NewClient(server.URL).Resolve(context.Background(), "Bearer token")
		if !errors.Is(err, ErrUnauthenticated) {
			t.Fatalf("subjectless identity error = %v, want ErrUnauthenticated", err)
		}
	})
}
