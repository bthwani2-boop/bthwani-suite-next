package payout

import (
	"os"
	"strings"
	"testing"
)

func TestPayoutDestinationOperatorContextUniqueRepairRemovesGlobalIndex(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/wlt-113_payout_destination_operator_context_unique_repair.sql")
	if err != nil {
		t.Fatalf("read payout destination OperatorContext repair migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_uidx",
		"DROP INDEX IF EXISTS wlt_payout_destinations_one_active_owner_idx",
		"wlt_payout_destinations_one_active_OperatorContext_owner_idx",
		"(operator_context_id, owner_actor_type, owner_actor_id)",
		"WHERE active = true",
		"RAISE EXCEPTION 'global payout destination owner uniqueness index still exists'",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("payout destination OperatorContext repair is missing %s", required)
		}
	}
}
