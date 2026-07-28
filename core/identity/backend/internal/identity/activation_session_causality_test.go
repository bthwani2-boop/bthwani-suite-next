package identity

import (
	"os"
	"strings"
	"testing"
)

func TestActivationSessionCausalityMigrationFailsClosed(t *testing.T) {
	migration, err := os.ReadFile("../../../database/migrations/identity-012_activation_session_causality.sql")
	if err != nil {
		t.Fatalf("read activation session causality migration: %v", err)
	}
	text := string(migration)
	for _, required := range []string{
		"BEFORE INSERT ON identity_sessions",
		"actor_updated_at = transaction_timestamp()",
		"status = 'consumed'",
		"consumed_at = transaction_timestamp()",
		"RAISE EXCEPTION 'session creation requires a consumed activation challenge'",
		"ERRCODE = '23514'",
		"DROP TRIGGER IF EXISTS identity_activation_session_causality_guard",
	} {
		if !strings.Contains(text, required) {
			t.Fatalf("activation session causality migration is missing %s", required)
		}
	}
	for _, forbidden := range []string{"code = '000000'", "phone_e164 = '+967", "username ="} {
		if strings.Contains(text, forbidden) {
			t.Fatalf("activation session causality migration trusts unsafe marker %s", forbidden)
		}
	}
}
