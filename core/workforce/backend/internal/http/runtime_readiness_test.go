package http

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

type fakeWorkforceRuntimeReadinessStore struct {
	ready bool
	err   error
}

func (f fakeWorkforceRuntimeReadinessStore) Ready(context.Context) (bool, error) {
	return f.ready, f.err
}

func serveWorkforceReadiness(store workforceRuntimeReadinessStore) *httptest.ResponseRecorder {
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/workforce/readiness", nil)
	(&server{readinessStore: store}).readiness(response, request)
	return response
}

func TestWorkforceReadinessRequiresGovernedRuntimeState(t *testing.T) {
	for _, tc := range []struct {
		name  string
		store workforceRuntimeReadinessStore
	}{
		{name: "missing database", store: nil},
		{name: "schema not ready", store: fakeWorkforceRuntimeReadinessStore{}},
		{name: "database failure", store: fakeWorkforceRuntimeReadinessStore{err: errors.New("database unavailable")}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			response := serveWorkforceReadiness(tc.store)
			if response.Code != http.StatusServiceUnavailable {
				t.Fatalf("expected 503, got %d body=%s", response.Code, response.Body.String())
			}
			if response.Header().Get("X-Workforce-Runtime-Status") != "NOT_READY" {
				t.Fatalf("missing fail-closed readiness header: %v", response.Header())
			}
			if response.Header().Get("Cache-Control") != "no-store" {
				t.Fatalf("readiness response may be cached: %v", response.Header())
			}
			if tc.name == "database failure" && response.Body.String() == "database unavailable" {
				t.Fatal("readiness leaked an internal database error")
			}
		})
	}
}

func TestWorkforceReadinessSucceedsOnlyWhenStoreIsReady(t *testing.T) {
	response := serveWorkforceReadiness(fakeWorkforceRuntimeReadinessStore{ready: true})
	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", response.Code, response.Body.String())
	}
}

func TestWorkforceReadinessMigrationMatchesActiveManifest(t *testing.T) {
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
	if len(active) != 1 || active[0] != workforceLatestMigration {
		t.Fatalf("workforce readiness migration drift: active=%v runtime=%s", active, workforceLatestMigration)
	}
}
