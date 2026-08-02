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

func TestPartnerCommercialModelVariableIsGovernedDBIntegration(t *testing.T) {
	db := openPlatformControlDBIntegration(t)

	var value string
	var owner, valueType, classification string
	if err := db.QueryRow(`
		SELECT value_json #>> '{}', owner_service, value_type, classification
		FROM platform_variables
		WHERE variable_key = 'VAR_PARTNER_COMMERCIAL_MODEL'
		  AND scope_type = 'global'
		  AND scope_id = ''`).Scan(&value, &owner, &valueType, &classification); err != nil {
		t.Fatal(err)
	}
	if value != "HYBRID" || owner != "dsh" || valueType != "string" || classification != "sensitive" {
		t.Fatalf("global partner model = value=%s owner=%s type=%s classification=%s", value, owner, valueType, classification)
	}

	suffix := time.Now().UTC().Format("20060102150405.000000000")
	partnerScope := "partner-j023-" + suffix
	_, err := db.Exec(`
		INSERT INTO platform_variables (
			variable_key, owner_service, value_type, classification,
			scope_type, scope_id, value_json, status, effective_from
		) VALUES (
			'VAR_PARTNER_COMMERCIAL_MODEL', 'dsh', 'string', 'sensitive',
			'partner', $1, '"HYBRID"'::jsonb, 'active', now()
		)`, partnerScope)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM platform_variables WHERE variable_key='VAR_PARTNER_COMMERCIAL_MODEL' AND scope_type='partner' AND scope_id=$1`, partnerScope)
	})

	_, err = db.Exec(`
		UPDATE platform_variables
		SET value_json = '"TENANT"'::jsonb
		WHERE variable_key='VAR_PARTNER_COMMERCIAL_MODEL'
		  AND scope_type='partner' AND scope_id=$1`, partnerScope)
	var pqErr *pq.Error
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "23514" {
		t.Fatalf("unsupported model error = %v, want check violation", err)
	}

	_, err = db.Exec(`
		UPDATE platform_variables
		SET expires_at = effective_from - interval '1 second'
		WHERE variable_key='VAR_PARTNER_COMMERCIAL_MODEL'
		  AND scope_type='partner' AND scope_id=$1`, partnerScope)
	pqErr = nil
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "23514" {
		t.Fatalf("retroactive expiry error = %v, want check violation", err)
	}

	_, err = db.Exec(`
		UPDATE platform_variables
		SET effective_from = now() - interval '1 day'
		WHERE variable_key='VAR_PARTNER_COMMERCIAL_MODEL'
		  AND scope_type='partner' AND scope_id=$1`, partnerScope)
	pqErr = nil
	if !errors.As(err, &pqErr) || string(pqErr.Code) != "23514" {
		t.Fatalf("retroactive model edit error = %v, want check violation", err)
	}
}
