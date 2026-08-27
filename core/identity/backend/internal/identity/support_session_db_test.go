package identity

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

// Support session issue contract (P1-6 regression guards).
//
// The canonical fix for P1-6 (credential recovery rotation) lives in
// support_session.go: an exact replay of IssueSupportSession with the same
// support_payload_fingerprint ROTATES the credential — the previous session
// is revoked and a fresh session with a real access token is issued. The
// rotation itself is proven by TestSupportSessionReplayRotatesUsableCredentialInDB.
//
// These guards cover the adjacent edges of the same contract that the
// rotation path must keep enforcing:
//   - a different payload on the same request id must never adopt or rotate
//     the issued session (ErrSupportSessionRequestConflict);
//   - a support session can never target the initiating actor
//     (ErrSupportSessionSelfTarget);
//   - a replay after the request's session was explicitly revoked must fail
//     closed with ErrSupportSessionCredentialUnavailable instead of issuing
//     an unbounded chain of credentials.
//
// Run with:
//
//	IDENTITY_REQUIRE_DB_TESTS=true DATABASE_URL=postgres://... go test ./internal/identity/...
func cleanupSupportReplayActors(t *testing.T, db *sql.DB, ids ...string) {
	t.Helper()
	for _, id := range ids {
		if _, err := db.Exec(`DELETE FROM identity_support_session_audit WHERE target_actor_id = $1 OR initiator_actor_id = $1`, id); err != nil {
			t.Errorf("clean up support-session audit for actor %s: %v", id, err)
		}
		if _, err := db.Exec(`DELETE FROM identity_sessions WHERE actor_id = $1 OR initiator_actor_id = $1`, id); err != nil {
			t.Errorf("clean up identity sessions for actor %s: %v", id, err)
		}
		if _, err := db.Exec(`DELETE FROM identity_actors WHERE id = $1`, id); err != nil {
			t.Errorf("clean up support replay actor %s: %v", id, err)
		}
	}
}

func issueReplayTestActors(t *testing.T) (target, initiator string, cleanup func()) {
	t.Helper()
	db := openIdentityTestDB(t)
	target = "identity-test-support-target"
	initiator = "identity-test-support-initiator"
	cleanupSupportReplayActors(t, db, target, initiator)
	insertIdentityTestActor(t, db, target, "support-replay-target", "identity-test-ctx", "", nil, nil, ActorStatusActive, 1)
	insertIdentityTestActor(t, db, initiator, "support-replay-initiator", "identity-test-ctx", "", nil, nil, ActorStatusActive, 1)
	return target, initiator, func() {
		cleanupSupportReplayActors(t, db, target, initiator)
	}
}

func TestIssueSupportSessionConflictingReplayIsRejected(t *testing.T) {
	db := openIdentityTestDB(t)
	target, initiator, cleanup := issueReplayTestActors(t)
	defer cleanup()

	repo := NewRepository(db)
	const requestID = "identity-test-support-replay-2"
	const reason = "integration regression: conflict contract"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM identity_sessions WHERE support_request_id = $1`, requestID)
	})

	if _, err := repo.IssueSupportSession(context.Background(), requestID, target, initiator, reason, 5); err != nil {
		t.Fatalf("first issue: %v", err)
	}

	// Same request id, different payload (reason) — a different claim must
	// never adopt the already-issued session, nor rotate it: the request id
	// is bound to the exact fingerprint it was first issued under.
	replay, err := repo.IssueSupportSession(context.Background(), requestID, target, initiator, reason+" altered", 5)
	if !errors.Is(err, ErrSupportSessionRequestConflict) {
		t.Fatalf("conflicting replay must return ErrSupportSessionRequestConflict, got token=%+v err=%v", replay, err)
	}
}

func TestIssueSupportSessionSelfTargetRejected(t *testing.T) {
	db := openIdentityTestDB(t)
	target, _, cleanup := issueReplayTestActors(t)
	defer cleanup()

	repo := NewRepository(db)
	if _, err := repo.IssueSupportSession(context.Background(), "identity-test-support-replay-3", target, target, "self target must be rejected", 5); !errors.Is(err, ErrSupportSessionSelfTarget) {
		t.Fatalf("self-target must return ErrSupportSessionSelfTarget, got %v", err)
	}
}

func TestIssueSupportSessionRevokedReplayFailsClosed(t *testing.T) {
	db := openIdentityTestDB(t)
	target, initiator, cleanup := issueReplayTestActors(t)
	defer cleanup()

	repo := NewRepository(db)
	const requestID = "identity-test-support-replay-4"
	const reason = "integration regression: revoked replay contract"
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM identity_sessions WHERE support_request_id = $1`, requestID)
	})

	if _, err := repo.IssueSupportSession(context.Background(), requestID, target, initiator, reason, 5); err != nil {
		t.Fatalf("first issue: %v", err)
	}
	if err := repo.RevokeSupportSession(context.Background(), requestID, "revoked replay guard"); err != nil {
		t.Fatalf("revoke: %v", err)
	}

	// The session for this request is revoked; an exact replay must fail
	// closed with ErrSupportSessionCredentialUnavailable rather than issue
	// a fresh credential outside a governed reissue flow.
	replay, err := repo.IssueSupportSession(context.Background(), requestID, target, initiator, reason, 5)
	if !errors.Is(err, ErrSupportSessionCredentialUnavailable) {
		t.Fatalf("replay after revoke must return ErrSupportSessionCredentialUnavailable, got token=%+v err=%v", replay, err)
	}
	if replay.AccessToken != "" || replay.TokenType != "" {
		t.Fatalf("revoked replay must not return a token payload, got %+v", replay)
	}
}
