package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type providersRuntimeTestStore struct {
	pingErr      error
	migrationID  string
	success      bool
	dirty        bool
	relations    map[string]bool
	databaseTime time.Time
}

func (s providersRuntimeTestStore) Ping(context.Context) error { return s.pingErr }

func (s providersRuntimeTestStore) LatestMigration(context.Context) (string, bool, bool, error) {
	return s.migrationID, s.success, s.dirty, nil
}

func (s providersRuntimeTestStore) RelationExists(_ context.Context, relation string) (bool, error) {
	return s.relations[relation], nil
}

func (s providersRuntimeTestStore) DatabaseTime(context.Context) (time.Time, error) {
	return s.databaseTime, nil
}

func healthyProvidersRuntimeStore() providersRuntimeTestStore {
	return providersRuntimeTestStore{
		migrationID: providersLatestMigration,
		success:     true,
		relations: map[string]bool{
			"external_providers":     true,
			"providers_action_audit": true,
			"providers_idempotency":  true,
		},
		databaseTime: time.Now(),
	}
}

func configureProvidersRuntimeTest(t *testing.T) {
	t.Helper()
	t.Setenv("PROVIDERS_IDENTITY_BASE_URL", "http://identity-api:8081")
	t.Setenv("PROVIDERS_READINESS_PROBE_TIMEOUT", "2s")
	t.Setenv("PROVIDERS_CLOCK_SKEW_LIMIT", "5s")
}

func TestProvidersOperationalRequestFailsClosedWithoutRuntimeStore(t *testing.T) {
	configureProvidersRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(nil, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/providers", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	if called {
		t.Fatal("operational request reached providers while runtime readiness was unavailable")
	}
}

func TestProvidersOperationalRequestFailsClosedOnStaleMigration(t *testing.T) {
	configureProvidersRuntimeTest(t)
	store := healthyProvidersRuntimeStore()
	store.migrationID = "providers-001-stale.sql"
	called := false
	handler := runtimeReadinessBoundary(store, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/providers/maps/search", nil))
	if recorder.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("stale migration request status=%d called=%v", recorder.Code, called)
	}
}

func TestProvidersOperationalRequestPassesOnlyAfterReadiness(t *testing.T) {
	configureProvidersRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(healthyProvidersRuntimeStore(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/providers/maps/search", nil))
	if recorder.Code != http.StatusNoContent || !called {
		t.Fatalf("healthy operational request status=%d called=%v", recorder.Code, called)
	}
	if recorder.Header().Get("X-Providers-Runtime-Status") != "HEALTHY" {
		t.Fatal("healthy operational request did not carry runtime status")
	}
}

func TestProvidersOperationalRequestRequiresIdentityConfiguration(t *testing.T) {
	configureProvidersRuntimeTest(t)
	t.Setenv("PROVIDERS_IDENTITY_BASE_URL", "")
	called := false
	handler := runtimeReadinessBoundary(healthyProvidersRuntimeStore(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/providers", nil))
	if recorder.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("missing identity configuration status=%d called=%v", recorder.Code, called)
	}
}

func TestProvidersPreflightBypassesReadiness(t *testing.T) {
	configureProvidersRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(nil, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodOptions, "/providers/maps/search", nil))
	if recorder.Code != http.StatusNoContent || !called {
		t.Fatalf("preflight status=%d called=%v", recorder.Code, called)
	}
}
