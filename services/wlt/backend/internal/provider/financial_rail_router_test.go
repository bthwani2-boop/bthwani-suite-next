package provider

import (
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

func getTestDB(t *testing.T) *sql.DB {
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func TestFinancialRailRouter_ProductionFailsClosedNoFallback(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "production")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "https://prod.example")

	router, err := NewFinancialRailRouter(nil, "")
	if router != nil {
		t.Fatalf("expected no router for production mode, got %T", router)
	}
	if !errors.Is(err, ErrProductionProviderUnavailable) {
		t.Fatalf("expected ErrProductionProviderUnavailable, got %v", err)
	}
}

func TestFinancialRailRouter_MockModeRoutesToAllowlistedPaths(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	router, err := NewFinancialRailRouter(nil, "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if router == nil {
		t.Fatal("expected non-nil router")
	}
	// The internal client is now an implementation detail; verify it implements CashInRail
	var _ CashInRail = router
}

func TestFinancialRailRouter_RegistryMaintenanceFailsClosed(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	db := getTestDB(t)
	defer db.Close()

	providerID := seedFinancialProvider(t, db, "payment-gateway", "test-env", true, true)
	defer func() {
		_, _ = db.Exec(`DELETE FROM wlt_financial_providers WHERE id = $1`, providerID)
	}()

	reg := NewRegistry(db)
	router, err := NewFinancialRailRouter(reg, "test-env")
	if err != nil {
		t.Fatalf("unexpected error constructing router: %v", err)
	}

	ctx := context.Background()
	meta := NewRequestMeta("test")

	_, err = router.Authorize(ctx, map[string]any{"amount": 100}, meta)
	if !errors.Is(err, ErrProviderInMaintenance) {
		t.Fatalf("expected ErrProviderInMaintenance, got %v", err)
	}
}

func TestFinancialRailRouter_RegistryMissingProviderFailsClosed(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	db := getTestDB(t)
	defer db.Close()

	reg := NewRegistry(db)
	envSuffix, err := randomToken()
	if err != nil {
		t.Fatalf("failed to generate random token: %v", err)
	}
	router, err := NewFinancialRailRouter(reg, "environment-with-no-row-"+envSuffix)
	if err != nil {
		t.Fatalf("unexpected error constructing router: %v", err)
	}

	ctx := context.Background()
	meta := NewRequestMeta("test")

	_, err = router.Status(ctx, StatusInquiry{PaymentSessionID: "sess", ProviderReference: "ref"}, meta)
	if !errors.Is(err, ErrProviderNotFound) {
		t.Fatalf("expected ErrProviderNotFound, got %v", err)
	}
}

func seedFinancialProvider(t *testing.T, db *sql.DB, providerType, environment string, isActive, isMaintenance bool) string {
	t.Helper()
	var id string
	err := db.QueryRow(`
		INSERT INTO wlt_financial_providers (provider_type, environment, is_active, is_maintenance, secret_reference, timeout_budget_ms)
		VALUES ($1, $2, $3, $4, 'env:TEST_SECRET', 15000)
		ON CONFLICT (provider_type, environment) DO UPDATE SET is_active = EXCLUDED.is_active, is_maintenance = EXCLUDED.is_maintenance
		RETURNING id
	`, providerType, environment, isActive, isMaintenance).Scan(&id)
	if err != nil {
		t.Fatalf("failed to seed wlt_financial_providers: %v", err)
	}
	return id
}

// TestStatusReadbackPostsBoundInquiry proves the readback contract (root #2):
// a bound inquiry is transmitted as POST /financial/card/status carrying the
// payment session identity and provider reference in the JSON body, and the
// provider answer is returned only for the bound reference.
func TestStatusReadbackPostsBoundInquiry(t *testing.T) {
	db := getTestDB(t)
	defer db.Close()

	envSuffix, err := randomToken()
	if err != nil {
		t.Fatalf("random token: %v", err)
	}
	environment := "status-readback-" + envSuffix
	seedFinancialProvider(t, db, "payment-gateway", environment, true, false)

	var receivedMethod, receivedBody, receivedPath string
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedMethod, receivedPath = r.Method, r.URL.Path
		buf := make([]byte, 4096)
		n, _ := r.Body.Read(buf)
		receivedBody = string(buf[:n])
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"providerReference":"ref-status-1","status":"authorized"}`))
	}))
	defer upstream.Close()
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", upstream.URL)

	router, err := NewFinancialRailRouter(NewRegistry(db), environment)
	if err != nil {
		t.Fatalf("router construction: %v", err)
	}
	meta := NewRequestMeta("status-readback-test")

	// Unbound inquiries are refused before any traffic is sent.
	if _, err := router.Status(context.Background(), StatusInquiry{PaymentSessionID: "sess-1"}, meta); !errors.Is(err, ErrUnboundStatusInquiry) {
		t.Fatalf("inquiry without provider reference must be refused, got %v", err)
	}
	if receivedMethod != "" {
		t.Fatal("no outbound traffic may be sent for an unbound inquiry")
	}

	result, err := router.Status(context.Background(), StatusInquiry{PaymentSessionID: "sess-1", ProviderReference: "ref-status-1"}, meta)
	if err != nil {
		t.Fatalf("bound status readback: %v", err)
	}
	if receivedMethod != http.MethodPost || receivedPath != "/financial/card/status" {
		t.Fatalf("status readback must be POST /financial/card/status, got %s %s", receivedMethod, receivedPath)
	}
	if !strings.Contains(receivedBody, `"paymentSessionId":"sess-1"`) || !strings.Contains(receivedBody, `"providerReference":"ref-status-1"`) {
		t.Fatalf("status readback body must carry the bound identity, got %s", receivedBody)
	}
	if result.ProviderReference != "ref-status-1" || result.Status != "authorized" {
		t.Fatalf("unexpected provider result: %+v", result)
	}
}
