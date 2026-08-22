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
	t.Setenv("WLT_DSH_BASE_URL", "http://dsh-api:8080")
	t.Setenv("DSH_WLT_SERVICE_TOKEN", "configured-test-service-token")
	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/wlt/readiness", nil)
	handleReadiness(store, permittingDecisions{}).ServeHTTP(response, request)
	return response
}

func TestReadinessFailsClosedWithoutGovernedFinancialSchema(t *testing.T) {
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

func TestReadinessSucceedsOnlyWithGovernedFinancialSchema(t *testing.T) {
	response := serveReadiness(t, fakeRuntimeReadinessStore{ready: true})
	if response.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", response.Code, response.Body.String())
	}
	var payload ReadinessResponse
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatal(err)
	}
	if payload.Dependencies["postgres"] != "ready" {
		t.Fatalf("unexpected dependency state: %v", payload.Dependencies)
	}
	if payload.Dependencies["finance_mutation_decision"] != "permitting" {
		t.Fatalf("finance mutation decision readiness is not visible: %v", payload.Dependencies)
	}
}

type migrationManifestDocument struct {
	Cutover    string `json:"cutover"`
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
	manifestPath := filepath.Join(migrationDirectory, "manifest.json")
	content, err := os.ReadFile(manifestPath)
	if err != nil {
		t.Fatal(err)
	}
	var manifest migrationManifestDocument
	if err := json.Unmarshal(content, &manifest); err != nil {
		t.Fatal(err)
	}
	latestOrdinal := -1
	latestRequired := manifest.Cutover
	for _, migration := range manifest.Migrations {
		if migration.State == "ACTIVE" && migration.Ordinal > latestOrdinal {
			latestOrdinal = migration.Ordinal
			latestRequired = migration.File
		}
	}
	if latestRequired != wltLatestMigration {
		t.Fatalf("WLT readiness migration drift: latest_required=%s runtime=%s", latestRequired, wltLatestMigration)
	}
}

// permittingDecisions stands in for a configured, answering finance decision
// authority so schema-focused readiness tests isolate the database dependency.
type permittingDecisions struct{}

func (permittingDecisions) IsCapabilityKilled(context.Context, string, string) (bool, error) {
	return false, nil
}

func TestReadinessReportsFinanceMutationDecisionDependency(t *testing.T) {
	t.Setenv("WLT_DSH_BASE_URL", "http://dsh-api:8080")
	t.Setenv("DSH_WLT_SERVICE_TOKEN", "configured-test-service-token")
	ready := fakeRuntimeReadinessStore{ready: true}

	for _, testCase := range []struct {
		name           string
		decisions      financeMutationDecisionProbe
		wantDependency string
		wantStatus     int
	}{
		{"absent dependency is not ready", nil, "missing", http.StatusServiceUnavailable},
		{"unanswerable dependency is not ready", erroringDecisions{}, "unavailable", http.StatusServiceUnavailable},
		{"killed switch is a healthy refusal", killedDecisions{}, "killed", http.StatusOK},
		{"permitting switch is ready", permittingDecisions{}, "permitting", http.StatusOK},
	} {
		t.Run(testCase.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodGet, "/wlt/readiness", nil)
			handleReadiness(ready, testCase.decisions).ServeHTTP(response, request)

			if response.Code != testCase.wantStatus {
				t.Fatalf("status = %d, want %d (%s)", response.Code, testCase.wantStatus, response.Body.String())
			}
			var decoded ReadinessResponse
			if err := json.Unmarshal(response.Body.Bytes(), &decoded); err != nil {
				t.Fatalf("decode readiness: %v", err)
			}
			if got := decoded.Dependencies["finance_mutation_decision"]; got != testCase.wantDependency {
				t.Fatalf("finance_mutation_decision = %q, want %q", got, testCase.wantDependency)
			}
		})
	}
}

type erroringDecisions struct{}

func (erroringDecisions) IsCapabilityKilled(context.Context, string, string) (bool, error) {
	return true, errors.New("decision authority unreachable")
}

type killedDecisions struct{}

func (killedDecisions) IsCapabilityKilled(context.Context, string, string) (bool, error) {
	return true, nil
}
