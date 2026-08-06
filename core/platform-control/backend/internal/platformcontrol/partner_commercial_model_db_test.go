package platformcontrol

import (
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/lib/pq"
)

func openPlatformControlDBIntegration(t *testing.T) *sql.DB {
	t.Helper()
	databaseURL := os.Getenv("DATABASE_URL")
	if databaseURL == "" {
		t.Skip("DATABASE_URL is required for platform-control database integration tests")
	}
	db, err := sql.Open("postgres", databaseURL)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.PingContext(t.Context()); err != nil {
		db.Close()
		t.Skipf("platform-control database unavailable: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func TestPartnerCommercialModelIsNotStoredByPlatformControlDBIntegration(t *testing.T) {
	db := openPlatformControlDBIntegration(t)

	var count int
	if err := db.QueryRow(`
		SELECT COUNT(*)
		FROM platform_variables
		WHERE variable_key = 'VAR_PARTNER_COMMERCIAL_MODEL'`).Scan(&count); err != nil {
		t.Fatal(err)
	}
	if count != 0 {
		t.Fatalf("Platform Control still stores %d partner commercial-model rows", count)
	}

	_, err := db.Exec(`
		INSERT INTO platform_variables (
			variable_key, owner_service, value_type, classification,
			scope_type, scope_id, value_json, status, effective_from
		) VALUES (
			'VAR_PARTNER_COMMERCIAL_MODEL', 'dsh', 'string', 'sensitive',
			'partner', 'partner-boundary-test', '"COMMISSION"'::jsonb, 'active', now()
		)`)
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "23514" {
		t.Fatalf("domain-owned variable write error = %v, want check violation", err)
	}
}

func TestPlatformControlStillStoresControlPlaneVariablesDBIntegration(t *testing.T) {
	db := openPlatformControlDBIntegration(t)
	key := "VAR_PLATFORM_BOUNDARY_TEST_" + time.Now().UTC().Format("20060102150405.000000000")
	_, err := db.Exec(`
		INSERT INTO platform_variables (
			variable_key, owner_service, value_type, classification,
			scope_type, scope_id, value_json, status
		) VALUES ($1, 'platform-control', 'boolean', 'internal', 'global', '', 'true'::jsonb, 'active')`, key)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM platform_variables WHERE variable_key=$1`, key)
	})
}
