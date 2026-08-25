package identity

import (
	"context"
	"database/sql"
	"testing"
)

// insertIdentityTestActor creates only the actor's base record directly. Access
// is always assigned through the canonical Identity RBAC writer so tests cannot
// bypass the production projection fence.
func insertIdentityTestActor(
	t *testing.T,
	db *sql.DB,
	actorID, username, operatorContextID, phone string,
	roles []string,
	permissions []Permission,
	status ActorLifecycleStatus,
	version int,
) {
	t.Helper()
	if _, err := db.Exec(`
        INSERT INTO identity_actors (
            id, username, password_hash, operator_context_id, phone_e164,
            roles, permissions, status, version, updated_at
        ) VALUES ($1, $2, '', $3, NULLIF($4, ''), ARRAY[]::text[], '[]'::jsonb, $5, $6, now())`,
		actorID, username, operatorContextID, phone, status, version); err != nil {
		t.Fatalf("insert identity test actor %s: %v", actorID, err)
	}
	if err := NewRepository(db).replaceActorAccess(context.Background(), actorID, roles, permissions, "identity-test-setup"); err != nil {
		t.Fatalf("assign canonical identity test actor access %s: %v", actorID, err)
	}
}
