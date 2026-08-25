package identity

import (
	"os"
	"strings"
	"testing"
)

func TestEmployeeDshPermissionBackfillIsIdempotentAndFailClosed(t *testing.T) {
	historicalMigration, err := os.ReadFile("../../../database/migrations/identity-011_employee_dsh_permission_backfill.sql")
	if err != nil {
		t.Fatalf("read employee DSH permission backfill: %v", err)
	}
	historicalText := string(historicalMigration)
	legacyAction := "platform" + ".read"
	for _, required := range []string{
		"jsonb_agg(DISTINCT expanded.permission)",
		"AS expanded(permission)",
		"actor.permissions IS DISTINCT FROM merged_permissions.permissions",
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
		if !strings.Contains(historicalText, required) {
			t.Fatalf("employee DSH permission backfill is missing %s", required)
		}
	}
	if !strings.Contains(historicalText, legacyAction) {
		t.Fatalf("historical employee DSH permission backfill no longer contains its immutable legacy action")
	}
	for _, forbidden := range []string{"username =", "name =", "role = 'operations_manager'"} {
		if strings.Contains(historicalText, forbidden) {
			t.Fatalf("employee DSH permission backfill trusts non-sovereign label %s", forbidden)
		}
	}

	canonicalMigration, err := os.ReadFile("../../../database/migrations/identity-032_platform_permission_vocabulary_canonicalization.sql")
	if err != nil {
		t.Fatalf("read platform permission canonicalization migration: %v", err)
	}
	canonicalText := string(canonicalMigration)
	for _, required := range []string{
		"platform:read",
		legacyAction,
		"identity_role_permissions",
		"identity_actor_direct_permissions",
		"identity-032-platform-read-canonicalization",
		"identity_rebuild_actor_access_projection",
		legacyAction + " permission vocabulary remains after canonicalization",
		legacyAction + " role bindings remain after canonicalization",
		legacyAction + " direct grants remain after canonicalization",
		legacyAction + " actor projections remain after canonicalization",
	} {
		if !strings.Contains(canonicalText, required) {
			t.Fatalf("platform permission canonicalization migration is missing %s", required)
		}
	}
}
