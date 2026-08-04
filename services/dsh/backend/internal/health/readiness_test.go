package health

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"testing"
)

type fakeRuntimeReadinessStore struct {
	ready bool
	err   error
}

func (f fakeRuntimeReadinessStore) Ready(context.Context) (bool, error) {
	return f.ready, f.err
}

// noopIdentityCheck returns HEALTHY for use in tests that don't test identity health.
func noopIdentityCheck(_ context.Context) string { return "HEALTHY" }

func serveReadiness(t *testing.T, store runtimeReadinessStore) *httptest.ResponseRecorder {
	t.Helper()
	t.Setenv("DSH_WLT_BASE_URL", "http://wlt-api:8083")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/readiness", nil)
	handleReadiness(store, func(context.Context) string { return "ready" }, noopIdentityCheck).ServeHTTP(response, request)
	return response
}

func TestReadinessFailsClosedWithoutGovernedSchema(t *testing.T) {
	for _, store := range []runtimeReadinessStore{
		nil,
		fakeRuntimeReadinessStore{},
		fakeRuntimeReadinessStore{err: errors.New("database details")},
	} {
		response := serveReadiness(t, store)
		if response.Code != http.StatusServiceUnavailable {
			t.Fatalf("expected 503, got %d body=%s", response.Code, response.Body.String())
		}
		if response.Header().Get("Cache-Control") != "no-store" {
			t.Fatalf("readiness response may be cached: %v", response.Header())
		}
	}
}

func TestReadinessRequiresAllDependencies(t *testing.T) {
	t.Setenv("DSH_WLT_BASE_URL", "http://wlt-api:8083")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/readiness", nil)
	handleReadiness(fakeRuntimeReadinessStore{ready: true}, func(context.Context) string { return "unavailable" }, noopIdentityCheck).ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("unavailable storage must block readiness, got %d", response.Code)
	}

	response = serveReadiness(t, fakeRuntimeReadinessStore{ready: true})
	if response.Code != http.StatusOK {
		t.Fatalf("expected ready response, got %d body=%s", response.Code, response.Body.String())
	}
	var payload ReadinessResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload.Dependencies["postgres"] != "HEALTHY" {
		t.Fatalf("unexpected dependency state: %v", payload.Dependencies)
	}
}

func TestReadinessIdentityDegradedReturns200(t *testing.T) {
	t.Setenv("DSH_WLT_BASE_URL", "http://wlt-api:8083")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/readiness", nil)
	handleReadiness(
		fakeRuntimeReadinessStore{ready: true},
		func(context.Context) string { return "ready" },
		func(context.Context) string { return "DEGRADED" },
	).ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("DEGRADED identity should return 200, got %d", response.Code)
	}
	var payload ReadinessResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload.Status != "DEGRADED" {
		t.Fatalf("expected DEGRADED status, got %s", payload.Status)
	}
}

func TestReadinessIdentityNotReadyReturns503(t *testing.T) {
	t.Setenv("DSH_WLT_BASE_URL", "http://wlt-api:8083")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/readiness", nil)
	handleReadiness(
		fakeRuntimeReadinessStore{ready: true},
		func(context.Context) string { return "ready" },
		func(context.Context) string { return "NOT_READY" },
	).ServeHTTP(response, request)
	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("NOT_READY identity should return 503, got %d", response.Code)
	}
}

type migrationManifestDocument struct {
	Migrations []struct {
		Ordinal int    `json:"ordinal"`
		File    string `json:"file"`
		State   string `json:"state"`
	} `json:"migrations"`
}

func TestReadinessMigrationMatchesGovernedManifestSet(t *testing.T) {
	_, testFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test source path")
	}
	migrationDirectory := filepath.Clean(filepath.Join(filepath.Dir(testFile), "../../../database/migrations"))
	manifestPaths := []string{
		filepath.Join(migrationDirectory, "manifest.json"),
		filepath.Join(migrationDirectory, "manifest.extensions.json"),
	}

	latestOrdinal := -1
	latestActive := ""
	for _, manifestPath := range manifestPaths {
		content, err := os.ReadFile(manifestPath)
		if err != nil {
			if errors.Is(err, os.ErrNotExist) && filepath.Base(manifestPath) == "manifest.extensions.json" {
				continue
			}
			t.Fatal(err)
		}
		var manifest migrationManifestDocument
		if err := json.Unmarshal(content, &manifest); err != nil {
			t.Fatal(err)
		}
		for _, migration := range manifest.Migrations {
			if migration.State == "ACTIVE" && migration.Ordinal > latestOrdinal {
				latestOrdinal = migration.Ordinal
				latestActive = migration.File
			}
		}
	}
	if latestActive != dshLatestMigration {
		t.Fatalf("DSH readiness migration drift: latest_active=%s runtime=%s", latestActive, dshLatestMigration)
	}
}
