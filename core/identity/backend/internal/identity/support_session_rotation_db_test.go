package identity

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func supportSessionIdentityTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("IDENTITY_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://identity_runtime:identity_runtime_password@localhost:5432/identity_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("open identity test db: %v", err)
		}
		t.Skipf("skipping identity DB test: %v", err)
	}
	if err := db.Ping(); err != nil {
		if closeErr := db.Close(); closeErr != nil {
			t.Fatalf("close identity test db after failed ping: %v (ping: %v)", closeErr, err)
		}
		if requireDB {
			t.Fatalf("ping identity test db: %v", err)
		}
		t.Skipf("skipping identity DB test: %v", err)
	}
	t.Cleanup(func() {
		if err := db.Close(); err != nil {
			t.Errorf("close identity test db: %v", err)
		}
	})
	return db
}

func TestSupportSessionReplayRotatesUsableCredentialInDB(t *testing.T) {
	db := supportSessionIdentityTestDB(t)
	stamp := time.Now().UnixNano()
	requestID := fmt.Sprintf("objective3-support-request-%d", stamp)
	targetID := fmt.Sprintf("objective3-target-%d", stamp)
	initiatorID := fmt.Sprintf("objective3-initiator-%d", stamp)
	repo := NewRepository(db)
	for _, actor := range []struct {
		id    string
		phone string
	}{
		{targetID, fmt.Sprintf("+9677%09d", stamp%1000000000)},
		{initiatorID, fmt.Sprintf("+9677%09d", (stamp+1)%1000000000)},
	} {
		if err := repo.UpsertActorWithAccess(context.Background(), ActorAccessProvisionInput{
			ID:                actor.id,
			Username:          actor.id,
			PasswordHash:      "test-hash",
			OperatorContextID: "objective3-context",
			PhoneE164:         actor.phone,
			Roles:             []string{"client"},
			GrantedBy:         "test-fixture",
		}); err != nil {
			t.Fatalf("provision actor %s: %v", actor.id, err)
		}
	}
	ctx := context.Background()
	first, err := repo.IssueSupportSession(ctx, requestID, targetID, initiatorID, "objective 3 replay proof", 5)
	if err != nil {
		t.Fatalf("first issue: %v", err)
	}
	if first.AccessToken == "" {
		t.Fatal("first issue returned an empty access token")
	}
	second, err := repo.IssueSupportSession(ctx, requestID, targetID, initiatorID, "objective 3 replay proof", 5)
	if err != nil {
		t.Fatalf("replay issue: %v", err)
	}
	if second.AccessToken == "" {
		t.Fatal("replay issue returned an empty access token")
	}
	if first.AccessToken == second.AccessToken || first.Identity.SessionID == second.Identity.SessionID {
		t.Fatal("replay did not rotate the credential")
	}
	if _, err := repo.ResolveSupportSession(ctx, first.AccessToken); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("old credential resolve error=%v, want ErrUnauthenticated", err)
	}
	resolved, err := repo.ResolveSupportSession(ctx, second.AccessToken)
	if err != nil {
		t.Fatalf("new credential resolve: %v", err)
	}
	if resolved.SupportRequestID != requestID || resolved.OperatorContextID != "objective3-context" {
		t.Fatalf("resolved identity=%+v", resolved)
	}
	var active, revoked int
	if err := db.QueryRow(`SELECT COUNT(*) FILTER (WHERE revoked_at IS NULL), COUNT(*) FILTER (WHERE revoked_at IS NOT NULL)
		FROM identity_sessions WHERE support_request_id=$1 AND session_kind='support'`, requestID).Scan(&active, &revoked); err != nil {
		t.Fatalf("count rotated sessions: %v", err)
	}
	if active != 1 || revoked != 1 {
		t.Fatalf("active=%d revoked=%d, want one each", active, revoked)
	}
}
