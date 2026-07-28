package payment

import (
	"os"
	"strings"
	"testing"
)

func TestReconciliationTenantGuardDerivesAndRejectsTenantMismatch(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/wlt-901_reconciliation_tenant_guard.sql")
	if err != nil {
		t.Fatalf("read reconciliation tenant guard migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"SELECT tenant_id",
		"FROM wlt_payment_sessions",
		"NEW.tenant_id := session_tenant_id",
		"NEW.tenant_id <> session_tenant_id",
		"RAISE EXCEPTION 'reconciliation tenant does not own payment session'",
		"BEFORE INSERT OR UPDATE OF tenant_id, payment_session_id",
		"reconciliation.tenant_id IS DISTINCT FROM session.tenant_id",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("reconciliation tenant guard is missing %s", required)
		}
	}
	for _, forbidden := range []string{"local-dsh", "DEFAULT 'tenant", "COALESCE(NEW.tenant_id"} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("reconciliation tenant guard contains unsafe fallback %s", forbidden)
		}
	}
}
