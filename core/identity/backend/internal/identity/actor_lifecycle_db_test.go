package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"testing"
	"time"
)

type lifecycleTestActor struct {
	id                string
	username          string
	phone             string
	operatorContextID string
	role              string
	passwordHash      string
	active            bool
}

func insertLifecycleTestActor(t *testing.T, db *sql.DB, actor lifecycleTestActor) {
	t.Helper()
	_, err := db.Exec(`
		INSERT INTO identity_actors
			(id, username, password_hash, operator_context_id, phone_e164, roles, permissions, active)
		VALUES ($1, $2, $3, $4, $5, ARRAY[$6]::text[], '[]'::jsonb, $7)`,
		actor.id, actor.username, actor.passwordHash, actor.operatorContextID, actor.phone, actor.role, actor.active)
	if err != nil {
		t.Fatalf("insert lifecycle test actor %s: %v", actor.id, err)
	}
}

func cleanupLifecycleTestActors(t *testing.T, db *sql.DB, actorIDs ...string) {
	t.Helper()
	clean := func() {
		for _, actorID := range actorIDs {
			if _, err := db.Exec(`DELETE FROM identity_actors WHERE id = $1`, actorID); err != nil {
				t.Errorf("clean up lifecycle test actor %s: %v", actorID, err)
			}
		}
	}
	clean()
	t.Cleanup(clean)
}

func TestActorLifecycleRevokesAuthenticationAndPreservesAuditDBIntegration(t *testing.T) {
	const (
		targetID            = "field-j003-lifecycle"
		requesterID         = "operator-j003-lifecycle"
		foreignRequesterID  = "operator-j003-foreign"
		inactiveRequesterID = "operator-j003-inactive"
		clientID            = "client-j003-lifecycle"
		provisionedID       = "captain-j003-provisioned"
		operatorContextID   = "j003-context"
	)
	db := openIdentityTestDB(t)
	// Delete targets first so their lifecycle events release requester FKs.
	cleanupLifecycleTestActors(t, db, targetID, clientID, provisionedID, requesterID, foreignRequesterID, inactiveRequesterID)

	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: targetID, username: "j003.field", phone: "+967700009301",
		operatorContextID: operatorContextID, role: "field", passwordHash: "activated-password-hash", active: true,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: requesterID, username: "j003.operator", phone: "+967700009302",
		operatorContextID: operatorContextID, role: "operator", passwordHash: "operator-password-hash", active: true,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: foreignRequesterID, username: "j003.foreign", phone: "+967700009303",
		operatorContextID: "j003-foreign-context", role: "operator", passwordHash: "operator-password-hash", active: true,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: inactiveRequesterID, username: "j003.inactive", phone: "+967700009304",
		operatorContextID: operatorContextID, role: "operator", passwordHash: "operator-password-hash", active: false,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: clientID, username: "j003.client", phone: "+967700009305",
		operatorContextID: operatorContextID, role: "client", passwordHash: "client-password-hash", active: true,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: provisionedID, username: "j003.provisioned", phone: "+967700009306",
		operatorContextID: operatorContextID, role: "captain", passwordHash: "", active: false,
	})

	if _, err := db.Exec(`
		INSERT INTO identity_sessions
			(id, actor_id, access_token_hash, refresh_token_hash, access_expires_at, refresh_expires_at)
		VALUES ('session-j003-lifecycle', $1, 'access-j003-lifecycle', 'refresh-j003-lifecycle', now() + interval '15 minutes', now() + interval '7 days')`, targetID); err != nil {
		t.Fatalf("insert lifecycle session: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO identity_activation_challenges
			(id, actor_id, actor_type, phone_e164, surface, code_hash, status, expires_at, issued_by_actor_id)
		VALUES ('challenge-j003-lifecycle', $1, 'field', '+967700009301', 'app-field', 'code-j003-lifecycle', 'pending', now() + interval '10 minutes', $2)`, targetID, requesterID); err != nil {
		t.Fatalf("insert lifecycle challenge: %v", err)
	}

	repository := NewRepository(db)
	ctx := context.Background()
	if err := repository.DeactivateActor(ctx, targetID, foreignRequesterID, "security review", "j003-foreign"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("cross-context requester must be forbidden, got %v", err)
	}
	if err := repository.DeactivateActor(ctx, targetID, inactiveRequesterID, "security review", "j003-inactive"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("inactive requester must be forbidden, got %v", err)
	}
	if err := repository.DeactivateActor(ctx, clientID, requesterID, "not workforce", "j003-client"); !errors.Is(err, ErrForbidden) {
		t.Fatalf("non-workforce target must be forbidden, got %v", err)
	}
	if err := repository.ReactivateActor(ctx, provisionedID, requesterID, "not activated", "j003-provisioned"); !errors.Is(err, ErrInvalidActorTransition) {
		t.Fatalf("never-activated target must not reactivate, got %v", err)
	}

	if err := repository.DeactivateActor(ctx, targetID, requesterID, "security review", "j003-deactivate"); err != nil {
		t.Fatalf("deactivate actor: %v", err)
	}
	assertLifecycleState(t, db, targetID, false, true, "revoked", "deactivated", requesterID, "security review", "j003-deactivate", 1)
	if err := repository.DeactivateActor(ctx, targetID, requesterID, "security review", "j003-deactivate"); err != nil {
		t.Fatalf("exact deactivation replay must succeed: %v", err)
	}
	if err := repository.DeactivateActor(ctx, targetID, requesterID, "security review", "j003-deactivate-other"); !errors.Is(err, ErrActorAlreadyDeactivated) {
		t.Fatalf("different deactivation retry must conflict, got %v", err)
	}

	if err := repository.ReactivateActor(ctx, targetID, requesterID, "review cleared", "j003-reactivate"); err != nil {
		t.Fatalf("reactivate actor: %v", err)
	}
	assertLifecycleState(t, db, targetID, true, true, "revoked", "reactivated", requesterID, "review cleared", "j003-reactivate", 1)
	if err := repository.ReactivateActor(ctx, targetID, requesterID, "review cleared", "j003-reactivate"); err != nil {
		t.Fatalf("exact reactivation replay must succeed: %v", err)
	}
	if err := repository.ReactivateActor(ctx, targetID, requesterID, "review cleared", "j003-reactivate-other"); !errors.Is(err, ErrActorAlreadyActive) {
		t.Fatalf("different reactivation retry must conflict, got %v", err)
	}
}

func assertLifecycleState(
	t *testing.T,
	db *sql.DB,
	actorID string,
	wantActive bool,
	wantSessionRevoked bool,
	wantChallengeStatus string,
	eventStatus string,
	requestedByActorID string,
	reason string,
	correlationID string,
	wantEventCount int,
) {
	t.Helper()
	var active, sessionRevoked bool
	var challengeStatus string
	if err := db.QueryRow(`SELECT active FROM identity_actors WHERE id = $1`, actorID).Scan(&active); err != nil {
		t.Fatalf("read actor state: %v", err)
	}
	if err := db.QueryRow(`SELECT revoked_at IS NOT NULL FROM identity_sessions WHERE actor_id = $1`, actorID).Scan(&sessionRevoked); err != nil {
		t.Fatalf("read session state: %v", err)
	}
	if err := db.QueryRow(`SELECT status FROM identity_activation_challenges WHERE actor_id = $1`, actorID).Scan(&challengeStatus); err != nil {
		t.Fatalf("read activation challenge state: %v", err)
	}
	if active != wantActive || sessionRevoked != wantSessionRevoked || challengeStatus != wantChallengeStatus {
		t.Fatalf("lifecycle persistence mismatch: active=%v revoked=%v challenge=%s", active, sessionRevoked, challengeStatus)
	}
	var count int
	if err := db.QueryRow(`
		SELECT count(*)
		FROM identity_actor_lifecycle_events
		WHERE actor_id = $1 AND status = $2 AND requested_by_actor_id = $3
		  AND reason = $4 AND correlation_id = $5`,
		actorID, eventStatus, requestedByActorID, reason, correlationID).Scan(&count); err != nil {
		t.Fatalf("read lifecycle audit: %v", err)
	}
	if count != wantEventCount {
		t.Fatalf("expected %d lifecycle events for %s, got %d", wantEventCount, eventStatus, count)
	}
}

func TestActorLifecycleConcurrentExactReplayDBIntegration(t *testing.T) {
	const (
		targetID          = "captain-j003-concurrent"
		requesterID       = "operator-j003-concurrent"
		operatorContextID = "j003-concurrent-context"
	)
	db := openIdentityTestDB(t)
	cleanupLifecycleTestActors(t, db, targetID, requesterID)
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: targetID, username: "j003.concurrent.captain", phone: "+967700009307",
		operatorContextID: operatorContextID, role: "captain", passwordHash: "activated-password-hash", active: true,
	})
	insertLifecycleTestActor(t, db, lifecycleTestActor{
		id: requesterID, username: "j003.concurrent.operator", phone: "+967700009308",
		operatorContextID: operatorContextID, role: "operator", passwordHash: "operator-password-hash", active: true,
	})

	db.SetMaxOpenConns(12)
	repository := NewRepository(db)
	const callers = 8
	errorsCh := make(chan error, callers)
	var waitGroup sync.WaitGroup
	for index := 0; index < callers; index++ {
		waitGroup.Add(1)
		go func(index int) {
			defer waitGroup.Done()
			ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
			defer cancel()
			if err := repository.DeactivateActor(ctx, targetID, requesterID, "concurrent suspension", "j003-concurrent"); err != nil {
				errorsCh <- fmt.Errorf("caller %d: %w", index, err)
			}
		}(index)
	}
	waitGroup.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Errorf("exact concurrent replay failed: %v", err)
	}
	var count int
	if err := db.QueryRow(`
		SELECT count(*) FROM identity_actor_lifecycle_events
		WHERE actor_id = $1 AND status = 'deactivated' AND correlation_id = 'j003-concurrent'`, targetID).Scan(&count); err != nil {
		t.Fatalf("count concurrent lifecycle events: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one durable event after %d exact replays, got %d", callers, count)
	}
}
