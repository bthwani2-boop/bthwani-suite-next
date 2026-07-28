package payout

import (
	"os"
	"strings"
	"testing"
)

func TestPayoutDestinationTenantUniqueRepairRemovesGlobalIndex(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/wlt-113_payout_destination_tenant_unique_repair.sql")
	if err != nil {
		t.Fatalf("read payout destination tenant repair migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_uidx",
		"DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_idx",
		"wlt_payout_destinations_one_active_tenant_owner_idx",
		"(tenant_id, owner_actor_type, owner_actor_id)",
		"WHERE active = true",
		"RAISE EXCEPTION 'global payout destination owner uniqueness index still exists'",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("payout destination tenant repair is missing %s", required)
		}
	}
}
