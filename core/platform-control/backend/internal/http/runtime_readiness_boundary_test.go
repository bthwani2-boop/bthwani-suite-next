package http

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

type platformControlRuntimeTestStore struct {
	pingErr      error
	migrationID  string
	success      bool
	dirty        bool
	relations    map[string]bool
	databaseTime time.Time
}

func (s platformControlRuntimeTestStore) Ping(context.Context) error { return s.pingErr }

func (s platformControlRuntimeTestStore) LatestMigration(context.Context) (string, bool, bool, error) {
	return s.migrationID, s.success, s.dirty, nil
}

func (s platformControlRuntimeTestStore) RelationExists(_ context.Context, relation string) (bool, error) {
	return s.relations[relation], nil
}

func (s platformControlRuntimeTestStore) DatabaseTime(context.Context) (time.Time, error) {
	return s.databaseTime, nil
}

func healthyPlatformControlRuntimeStore() platformControlRuntimeTestStore {
	return platformControlRuntimeTestStore{
		migrationID: platformControlLatestMigration,
		success:     true,
		relations: map[string]bool{
			"platform_variables":        true,
			"platform_feature_flags":    true,
			"platform_change_sets":      true,
			"platform_change_set_items": true,
			"platform_audit_events":     true,
			"platform_rollouts":         true,
		},
		databaseTime: time.Now(),
	}
}

func configurePlatformControlRuntimeTest(t *testing.T) {
	t.Helper()
	t.Setenv("PLATFORM_CONTROL_DSH_SERVICE_TOKEN", "01234567890123456789012345678901")
	t.Setenv("PLATFORM_CONTROL_READINESS_PROBE_TIMEOUT", "2s")
	t.Setenv("PLATFORM_CONTROL_CLOCK_SKEW_LIMIT", "5s")
	lastReadinessFailed.Store(false)
}

func TestPlatformOperationalRequestFailsClosedWithoutRuntimeStore(t *testing.T) {
	configurePlatformControlRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(nil, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/platform/v1/variables", nil))
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	if called {
		t.Fatal("operational request reached the service while runtime readiness was unavailable")
	}
}

func TestPlatformOperationalRequestFailsClosedOnStaleMigration(t *testing.T) {
	configurePlatformControlRuntimeTest(t)
	store := healthyPlatformControlRuntimeStore()
	store.migrationID = "platform-008-stale.sql"
	called := false
	handler := runtimeReadinessBoundary(store, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodPost, "/platform/v1/change-sets", nil))
	if recorder.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("stale migration request status=%d called=%v", recorder.Code, called)
	}
}

func TestPlatformOperationalRequestPassesOnlyAfterReadiness(t *testing.T) {
	configurePlatformControlRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(healthyPlatformControlRuntimeStore(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/platform/v1/variables", nil))
	if recorder.Code != http.StatusNoContent || !called {
		t.Fatalf("healthy operational request status=%d called=%v", recorder.Code, called)
	}
	if recorder.Header().Get("X-Platform-Control-Runtime-Status") != "HEALTHY" {
		t.Fatal("healthy operational request did not carry runtime status")
	}
}

func TestPlatformPreflightAndLivenessDoNotDependOnReadiness(t *testing.T) {
	configurePlatformControlRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(nil, http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	preflight := httptest.NewRecorder()
	handler.ServeHTTP(preflight, httptest.NewRequest(http.MethodOptions, "/platform/v1/variables", nil))
	if preflight.Code != http.StatusNoContent || !called {
		t.Fatalf("preflight status=%d called=%v", preflight.Code, called)
	}

	called = false
	readiness := httptest.NewRecorder()
	handler.ServeHTTP(readiness, httptest.NewRequest(http.MethodGet, "/platform/readiness", nil))
	if readiness.Code != http.StatusServiceUnavailable || called {
		t.Fatalf("readiness status=%d called=%v; readiness must fail closed without the runtime store", readiness.Code, called)
	}

	// Liveness remains independent of operational readiness.
	called = false
	liveness := httptest.NewRecorder()
	handler.ServeHTTP(liveness, httptest.NewRequest(http.MethodGet, "/platform/health", nil))
	if liveness.Code != http.StatusNoContent || !called {
		t.Fatalf("liveness status=%d called=%v", liveness.Code, called)
	}
}

func TestPlatformReadinessPassesOnlyAfterRuntimeProbes(t *testing.T) {
	configurePlatformControlRuntimeTest(t)
	called := false
	handler := runtimeReadinessBoundary(healthyPlatformControlRuntimeStore(), http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/platform/readiness", nil))
	if recorder.Code != http.StatusNoContent || !called {
		t.Fatalf("readiness status=%d called=%v; healthy runtime must reach the canonical route", recorder.Code, called)
	}
}
