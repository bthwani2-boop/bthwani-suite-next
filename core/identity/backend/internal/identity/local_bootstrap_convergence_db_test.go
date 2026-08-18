package identity

import (
	"context"
	"database/sql"
	"testing"

	"github.com/lib/pq"
)

// bootstrapLocalIdentityState mirrors the sequence cmd/identity-api runs at
// startup and on every supervisor pass, so these tests exercise the same
// authority the runtime does rather than a subset of it.
func bootstrapLocalIdentityState(t *testing.T, repo *Repository, input LocalBootstrap) {
	t.Helper()
	ctx := context.Background()
	if err := repo.BootstrapLocalActors(ctx, input); err != nil {
		t.Fatalf("bootstrap local actors: %v", err)
	}
	if err := repo.BootstrapLocalPlatformActors(ctx, input); err != nil {
		t.Fatalf("bootstrap local platform actors: %v", err)
	}
	if err := repo.ReconcileLocalBootstrapSecurityState(ctx, input); err != nil {
		t.Fatalf("reconcile local bootstrap security state: %v", err)
	}
}

// The local bootstrap used to run only once, at process start. A database that
// was emptied underneath a live identity-api therefore stayed unauthenticated
// forever, and every login returned INVALID_CREDENTIALS. These tests pin the two
// properties the runtime supervisor depends on against a real schema: convergence
// is observable, and repairing it is idempotent.
//
// Run with:
//
//	IDENTITY_REQUIRE_DB_TESTS=true DATABASE_URL=postgres://... go test ./internal/identity/...
func localBootstrapTestInput() LocalBootstrap {
	return LocalBootstrap{
		Enabled:           true,
		Password:          "123456",
		OperatorContextID: "local-dsh",
	}
}

func countCanonicalLocalActors(t *testing.T, db *sql.DB, operatorContextID string) int {
	t.Helper()
	var present int
	if err := db.QueryRow(`
SELECT count(*)
FROM identity_actors
WHERE username = ANY($1)
  AND operator_context_id = $2
  AND status = 'ACTIVE'`,
		pq.Array(localBootstrapSecurityUsernames()),
		operatorContextID,
	).Scan(&present); err != nil {
		t.Fatalf("count canonical local actors: %v", err)
	}
	return present
}

func TestLocalBootstrapConvergenceIsIdempotentDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)
	input := localBootstrapTestInput()
	ctx := context.Background()

	for pass := 0; pass < 2; pass++ {
		bootstrapLocalIdentityState(t, repo, input)
	}

	expected := len(localBootstrapSecurityUsernames())
	if present := countCanonicalLocalActors(t, db, input.OperatorContextID); present != expected {
		t.Fatalf("repeated bootstrap must converge on exactly %d actors, got %d", expected, present)
	}

	converged, err := repo.LocalBootstrapConverged(ctx, input)
	if err != nil {
		t.Fatalf("convergence check: %v", err)
	}
	if !converged {
		t.Fatal("a freshly bootstrapped runtime must report convergence")
	}
}

func TestLocalBootstrapConvergenceDetectsAndRepairsAnEmptiedDatabaseDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)
	input := localBootstrapTestInput()
	ctx := context.Background()

	bootstrapLocalIdentityState(t, repo, input)

	// This is the exact state a governed database rebuild leaves behind while
	// identity-api keeps serving.
	if _, err := db.Exec(`
		DELETE FROM identity_activation_challenges AS challenge
		USING identity_actors AS actor
		WHERE challenge.issued_by_actor_id = actor.id
		  AND actor.username = ANY($1)
		  AND actor.operator_context_id = $2`,
		pq.Array(localBootstrapSecurityUsernames()), input.OperatorContextID); err != nil {
		t.Fatalf("clear canonical local activation issuers: %v", err)
	}
	if _, err := db.Exec(
		`DELETE FROM identity_actors WHERE username = ANY($1)`,
		pq.Array(localBootstrapSecurityUsernames()),
	); err != nil {
		t.Fatalf("empty the canonical local actors: %v", err)
	}

	converged, err := repo.LocalBootstrapConverged(ctx, input)
	if err != nil {
		t.Fatalf("convergence check after wipe: %v", err)
	}
	if converged {
		t.Fatal("a database with no canonical actors must not report convergence")
	}

	bootstrapLocalIdentityState(t, repo, input)

	converged, err = repo.LocalBootstrapConverged(ctx, input)
	if err != nil {
		t.Fatalf("convergence check after repair: %v", err)
	}
	if !converged {
		t.Fatal("repairing the bootstrap must restore convergence without a process restart")
	}

	// The repaired credentials must actually authenticate; a restored row with a
	// stale hash would still fail with INVALID_CREDENTIALS.
	if _, err := repo.Login(ctx, "operator", input.Password, "identity-db-test", "127.0.0.1"); err != nil {
		t.Fatalf("operator must authenticate after bootstrap repair: %v", err)
	}
}

func TestLocalBootstrapConvergenceRejectsMissingOperatorContextDBIntegration(t *testing.T) {
	db := openIdentityTestDB(t)
	repo := newOtpTestRepository(t, db)

	if _, err := repo.LocalBootstrapConverged(context.Background(), LocalBootstrap{
		Enabled:  true,
		Password: "123456",
	}); err == nil {
		t.Fatal("convergence must fail closed without an operator context")
	}
}
