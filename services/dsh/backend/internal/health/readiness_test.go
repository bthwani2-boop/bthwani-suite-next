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

func serveReadiness(t *testing.T, store runtimeReadinessStore) *httptest.ResponseRecorder {
	t.Helper()
	t.Setenv("DSH_WLT_BASE_URL", "http://wlt-api:8083")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/dsh/readiness", nil)
	handleReadiness(store, func(context.Context) string { return "ready" }).ServeHTTP(response, request)
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
	handleReadiness(fakeRuntimeReadinessStore{ready: true}, func(context.Context) string { return "unavailable" }).ServeHTTP(response, request)
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
	if payload.Dependencies["postgres"] != "ready" {
		t.Fatalf("unexpected dependency state: %v", payload.Dependencies)
	}
}

func TestReadinessMigrationMatchesActiveManifest(t *testing.T) {
	_, testFile, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("cannot resolve test source path")
	}
	manifestPath := filepath.Clean(filepath.Join(filepath.Dir(testFile), "../../../database/migrations/manifest.json"))
	content, err := os.ReadFile(manifestPath)
	if err != nil {
		t.Fatal(err)
	}
	var manifest struct {
		Migrations []struct {
			File  string `json:"file"`
			State string `json:"state"`
		} `json:"migrations"`
	}
	if err := json.Unmarshal(content, &manifest); err != nil {
		t.Fatal(err)
	}
	active := make([]string, 0, 1)
	for _, migration := range manifest.Migrations {
		if migration.State == "ACTIVE" {
			active = append(active, migration.File)
		}
	}
	if len(active) != 1 || active[0] != dshLatestMigration {
		t.Fatalf("DSH readiness migration drift: active=%v runtime=%s", active, dshLatestMigration)
	}
}
