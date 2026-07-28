package identity

import (
	"os"
	"strings"
	"testing"
)

func TestEmployeeDshPermissionBackfillIsIdempotentAndFailClosed(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/identity-011_employee_dsh_permission_backfill.sql")
	if err != nil {
		t.Fatalf("read employee DSH permission backfill: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"jsonb_agg(DISTINCT expanded.permission)",
		"AS expanded(permission)",
		"actor.permissions IS DISTINCT FROM merged_permissions.permissions",
		"platform.read",
		"platform.manage",
		"department:operations",
		"operations.read",
		"operations.manage",
		"department:partners",
		"partners.activate",
		"department:finance",
		"finance.manage",
		"department:support",
		"support.manage",
		"RAISE EXCEPTION 'platform owner DSH permissions are incomplete'",
		"RAISE EXCEPTION 'platform coordinator DSH permissions are incomplete'",
		"RAISE EXCEPTION 'operations manager DSH permissions are incomplete'",
		"RAISE EXCEPTION 'partners manager DSH permissions are incomplete'",
		"RAISE EXCEPTION 'finance manager DSH permissions are incomplete'",
		"RAISE EXCEPTION 'support manager DSH permissions are incomplete'",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("employee DSH permission backfill is missing %s", required)
		}
	}
	for _, forbidden := range []string{"username =", "name =", "role = 'operations_manager'"} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("employee DSH permission backfill trusts non-sovereign label %s", forbidden)
		}
	}
}
