package payment

import (
	"os"
	"strings"
	"testing"
)

func TestReconciliationOperatorContextGuardDerivesAndRejectsOperatorContextMismatch(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/wlt-901_reconciliation_OperatorContext_guard.sql")
	if err != nil {
		t.Fatalf("read reconciliation OperatorContext guard migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"SELECT operator_context_id",
		"FROM wlt_payment_sessions",
		"NEW.operator_context_id := session_operator_context_id",
		"NEW.operator_context_id <> session_operator_context_id",
		"RAISE EXCEPTION 'reconciliation OperatorContext does not own payment session'",
		"BEFORE INSERT OR UPDATE OF operator_context_id, payment_session_id",
		"reconciliation.operator_context_id IS DISTINCT FROM session.operator_context_id",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("reconciliation OperatorContext guard is missing %s", required)
		}
	}
	for _, forbidden := range []string{"local-dsh", "DEFAULT 'OperatorContext", "COALESCE(NEW.operator_context_id"} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("reconciliation OperatorContext guard contains unsafe fallback %s", forbidden)
		}
	}
}
