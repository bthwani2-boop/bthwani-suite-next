package identity

import (
	"context"
	"database/sql"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"
)

// These are the first database-backed tests in core/identity: the public
// consumer OTP path was broken against a real schema (issued_by_actor_id is
// NOT NULL with a foreign key onto identity_actors, and the self-service path
// wrote the literal "system", which does not exist) while every in-memory test
// passed. Run with:
//
//	IDENTITY_REQUIRE_DB_TESTS=true DATABASE_URL=postgres://... go test ./internal/identity/...
func openIdentityTestDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("IDENTITY_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set IDENTITY_REQUIRE_DB_TESTS=true to run identity DB integration tests")
	}
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when IDENTITY_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open identity test database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping identity test database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func newOtpTestRepository(t *testing.T, db *sql.DB) *Repository {
	t.Helper()
	// NewRepository reads the activation secret from the environment; without at
	// least 32 bytes every activation path short-circuits on ErrActivationUnavailable.
	t.Setenv("IDENTITY_ACTIVATION_HMAC_SECRET", strings.Repeat("k", 32))
	return NewRepository(db)
}

func cleanupTestPhone(t *testing.T, db *sql.DB, phone string) {
	t.Helper()
	// identity_activation_challenges cascades from identity_actors.
	if _, err := db.Exec(`DELETE FROM identity_actors WHERE phone_e164 = $1`, phone); err != nil {
		t.Fatalf("clean up test actor: %v", err)
	}
}

func TestRequestOtpForTenantIssuesChallengeForNewConsumerDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	const phone = "+967700000901"
	cleanupTestPhone(t, db, phone)
	t.Cleanup(func() { cleanupTestPhone(t, db, phone) })

	repository := newOtpTestRepository(t, db)
	result, err := repository.RequestOtpForTenant(context.Background(), "local-dsh", OtpInput{
		ActorType: "client",
		Phone:     phone,
	})
	if err != nil {
		t.Fatalf("public consumer OTP request failed: %v", err)
	}
	if result.ActivationID == "" || result.Code == "" {
		t.Fatalf("OTP request returned an empty challenge: %#v", result)
	}

	var issuedBy, actorID string
	if err := db.QueryRow(`
		SELECT c.issued_by_actor_id, c.actor_id
		FROM identity_activation_challenges c
		WHERE c.id = $1`, result.ActivationID).Scan(&issuedBy, &actorID); err != nil {
		t.Fatalf("read back the issued challenge: %v", err)
	}
	// Self-service means the actor issues their own challenge; "system" is not
	// an actor and violates the issued_by_actor_id foreign key.
	if issuedBy != actorID {
		t.Fatalf("self-service challenge must be self-issued, got issuedBy=%q actorID=%q", issuedBy, actorID)
	}

	var active bool
	if err := db.QueryRow(`SELECT active FROM identity_actors WHERE id = $1`, actorID).Scan(&active); err != nil {
		t.Fatalf("read back the bootstrapped actor: %v", err)
	}
	if active {
		t.Fatal("an actor bootstrapped by an OTP request must stay inactive until the code is consumed")
	}
}

func TestRequestOtpForTenantRejectsAnotherTenantsPhoneDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	const phone = "+967700000902"
	cleanupTestPhone(t, db, phone)
	t.Cleanup(func() { cleanupTestPhone(t, db, phone) })

	repository := newOtpTestRepository(t, db)
	if _, err := repository.RequestOtpForTenant(context.Background(), "local-dsh", OtpInput{
		ActorType: "client",
		Phone:     phone,
	}); err != nil {
		t.Fatalf("seed the first tenant's consumer: %v", err)
	}

	_, err := repository.RequestOtpForTenant(context.Background(), "other-tenant", OtpInput{
		ActorType: "client",
		Phone:     phone,
	})
	if err == nil {
		t.Fatal("a phone bound to one tenant must not be claimable by another")
	}
	if !strings.Contains(err.Error(), ErrOperatorContextMismatch.Error()) {
		t.Fatalf("expected tenant mismatch, got %v", err)
	}
}
