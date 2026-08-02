package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"
)

type fakeRuntimeReadinessStore struct {
	ping            func(context.Context) error
	migrationID     string
	migrationOK     bool
	migrationDirty  bool
	migrationErr    error
	relations       map[string]bool
	relationErr     error
	databaseTime    time.Time
	databaseTimeErr error
}

func readyRuntimeStore() *fakeRuntimeReadinessStore {
	return &fakeRuntimeReadinessStore{
		migrationID: identityLatestMigration,
		migrationOK: true,
		relations: map[string]bool{
			"identity_actors":                true,
			"identity_sessions":              true,
			"identity_activation_challenges": true,
			"identity_login_attempts":        true,
		},
		databaseTime: time.Now(),
	}
}

func (s *fakeRuntimeReadinessStore) Ping(ctx context.Context) error {
	if s.ping != nil {
		return s.ping(ctx)
	}
	return nil
}

func (s *fakeRuntimeReadinessStore) LatestMigration(context.Context) (string, bool, bool, error) {
	return s.migrationID, s.migrationOK, s.migrationDirty, s.migrationErr
}

func (s *fakeRuntimeReadinessStore) RelationExists(_ context.Context, relation string) (bool, error) {
	if s.relationErr != nil {
		return false, s.relationErr
	}
	return s.relations[relation], nil
}

func (s *fakeRuntimeReadinessStore) DatabaseTime(context.Context) (time.Time, error) {
	return s.databaseTime, s.databaseTimeErr
}

func resetRuntimeProbeState() {
	lastReadinessFailed.Store(false)
	readinessSuccesses.Store(0)
	readinessFailures.Store(0)
}

func serveRuntimeProbe(store runtimeReadinessStore, path string) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, path, nil)
	runtimeReadinessBoundary(store, http.NotFoundHandler()).ServeHTTP(response, request)
	return response
}

func TestRuntimeReadinessProbePassesCompleteGovernedState(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)

	response := serveRuntimeProbe(readyRuntimeStore(), "/identity/readiness")

	if response.Code != http.StatusOK {
		t.Fatalf("expected ready response, got status=%d body=%s", response.Code, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"status":"HEALTHY"`) {
		t.Fatalf("expected canonical HEALTHY state, body=%s", response.Body.String())
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("readiness must not be cached, headers=%v", response.Header())
	}
}

func TestRuntimeReadinessProbeRejectsStaleMigration(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	store := readyRuntimeStore()
	store.migrationID = "identity-011_employee_dsh_permission_backfill.sql"

	response := serveRuntimeProbe(store, "/identity/readiness")

	assertNotReady(t, response)
}

func TestRuntimeReadinessProbeRejectsDirtyMigration(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	store := readyRuntimeStore()
	store.migrationDirty = true

	response := serveRuntimeProbe(store, "/identity/readiness")

	assertNotReady(t, response)
}

func TestRuntimeReadinessProbeRejectsMissingRateLimiterRelation(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	store := readyRuntimeStore()
	store.relations["identity_login_attempts"] = false

	response := serveRuntimeProbe(store, "/identity/readiness")

	assertNotReady(t, response)
}

func TestRuntimeReadinessProbeRejectsClockSkew(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_CLOCK_SKEW_LIMIT", "500ms")
	store := readyRuntimeStore()
	store.databaseTime = time.Now().Add(-2 * time.Second)

	response := serveRuntimeProbe(store, "/identity/readiness")

	assertNotReady(t, response)
}

func TestRuntimeReadinessProbeTimesOutDependency(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_READINESS_PROBE_TIMEOUT", "10ms")
	store := readyRuntimeStore()
	store.ping = func(ctx context.Context) error {
		<-ctx.Done()
		return ctx.Err()
	}

	startedAt := time.Now()
	response := serveRuntimeProbe(store, "/identity/readiness")

	assertNotReady(t, response)
	if elapsed := time.Since(startedAt); elapsed > time.Second {
		t.Fatalf("readiness timeout was not bounded: %s", elapsed)
	}
}

func TestRuntimeReadinessProbeRejectsInvalidTimingConfiguration(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	t.Setenv("IDENTITY_READINESS_PROBE_TIMEOUT", "not-a-duration")

	response := serveRuntimeProbe(readyRuntimeStore(), "/identity/readiness")

	assertNotReady(t, response)
}

func TestRuntimeHealthReportsDegradedAfterReadinessFailureWithoutLeakingSecrets(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	secret := strings.Repeat("sensitive-value-", 3)
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", secret)
	store := readyRuntimeStore()
	store.migrationErr = errors.New("database details must not reach the response")

	readiness := serveRuntimeProbe(store, "/identity/readiness")
	assertNotReady(t, readiness)
	health := serveRuntimeProbe(store, "/identity/health")

	if health.Code != http.StatusOK || !strings.Contains(health.Body.String(), `"status":"DEGRADED"`) {
		t.Fatalf("unexpected degraded health response status=%d body=%s", health.Code, health.Body.String())
	}
	if strings.Contains(health.Body.String(), secret) || strings.Contains(readiness.Body.String(), "database details") {
		t.Fatalf("probe response leaked sensitive/internal details: health=%s readiness=%s", health.Body.String(), readiness.Body.String())
	}
}

func TestRuntimeReadinessProbeIsConcurrentSafe(t *testing.T) {
	resetRuntimeProbeState()
	configureIdentityRuntime(t)
	store := readyRuntimeStore()
	handler := runtimeReadinessBoundary(store, http.NotFoundHandler())

	const probes = 32
	var wg sync.WaitGroup
	errorsCh := make(chan string, probes)
	for i := 0; i < probes; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, readinessRequest())
			if response.Code != http.StatusOK {
				errorsCh <- response.Body.String()
			}
		}()
	}
	wg.Wait()
	close(errorsCh)

	for body := range errorsCh {
		t.Fatalf("concurrent readiness probe failed: %s", body)
	}
	if got := readinessSuccesses.Load(); got != probes {
		t.Fatalf("expected %d successful probe metrics, got %d", probes, got)
	}
}

func assertNotReady(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected not-ready status, got status=%d body=%s", response.Code, response.Body.String())
	}
	if response.Header().Get("X-Identity-Runtime-Status") != "NOT_READY" {
		t.Fatalf("missing canonical not-ready header: %v", response.Header())
	}
	if !strings.Contains(response.Body.String(), "IDENTITY_NOT_READY") {
		t.Fatalf("missing canonical error code: %s", response.Body.String())
	}
}
