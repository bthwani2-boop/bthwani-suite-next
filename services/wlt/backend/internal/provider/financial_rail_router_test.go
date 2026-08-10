package provider

import (
	"context"
	"database/sql"
	"errors"
	"os"
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

	router, err := NewDefaultFinancialRailRouter()
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

	router, err := NewDefaultFinancialRailRouter()
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if router == nil {
		t.Fatal("expected non-nil router")
	}
	if _, ok := router.provider.(*Client); !ok {
		t.Fatalf("expected mock provider to be *Client, got %T", router.provider)
	}

	var _ CashInRail = router
}

func TestFinancialRailRouter_RegistryMaintenanceFailsClosed(t *testing.T) {
	t.Setenv("WLT_FINANCIAL_PROVIDER_MODE", "mock")
	t.Setenv("WLT_FINANCIAL_PROVIDER_BASE_URL", "http://localhost:8080")
	t.Setenv("WLT_ALLOW_MOCK_PROVIDER", "true")

	config, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected LoadConfig error: %v", err)
	}

	db := getTestDB(t)
	defer db.Close()

	providerID := seedFinancialProvider(t, db, "payment-gateway", "test-env", true, true)
	defer func() {
		_, _ = db.Exec(`DELETE FROM wlt_financial_providers WHERE id = $1`, providerID)
	}()

	reg := NewRegistry(db)
	router, err := NewFinancialRailRouter(config, reg, "test-env")
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

	config, err := LoadConfig()
	if err != nil {
		t.Fatalf("unexpected LoadConfig error: %v", err)
	}

	db := getTestDB(t)
	defer db.Close()

	reg := NewRegistry(db)
	router, err := NewFinancialRailRouter(config, reg, "environment-with-no-row-"+randomToken())
	if err != nil {
		t.Fatalf("unexpected error constructing router: %v", err)
	}

	ctx := context.Background()
	meta := NewRequestMeta("test")

	_, err = router.Status(ctx, meta)
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
