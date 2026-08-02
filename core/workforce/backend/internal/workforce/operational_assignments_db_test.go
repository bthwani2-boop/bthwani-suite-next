package workforce

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func openWorkforceAssignmentsTestDB(t *testing.T) *sql.DB {
	t.Helper()
	if os.Getenv("WORKFORCE_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set WORKFORCE_REQUIRE_DB_TESTS=true to run Workforce DB integration tests")
	}
	dsn := strings.TrimSpace(os.Getenv("DATABASE_URL"))
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when WORKFORCE_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open Workforce database: %v", err)
	}
	if err := db.Ping(); err != nil {
		t.Fatalf("ping Workforce database: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	return db
}

func cleanupOperationalAssignmentActor(t *testing.T, db *sql.DB, actorID string) {
	t.Helper()
	clean := func() {
		if _, err := db.Exec(`DELETE FROM workforce_operational_assignment_audit WHERE actor_id = $1`, actorID); err != nil {
			t.Errorf("clean assignment audit: %v", err)
		}
		if _, err := db.Exec(`DELETE FROM workforce_operational_assignments WHERE actor_id = $1`, actorID); err != nil {
			t.Errorf("clean assignments: %v", err)
		}
	}
	clean()
	t.Cleanup(clean)
}

func TestOperationalAssignmentsTrustedIsolationAndIdempotencyDBIntegration(t *testing.T) {
	const (
		actorID          = "field-crosscut-assignments"
		operatorContext  = "crosscut-context"
		foreignContext   = "crosscut-foreign"
		requestingActor  = "operator-crosscut"
		firstCorrelation = "assignments-crosscut-1"
	)
	db := openWorkforceAssignmentsTestDB(t)
	cleanupOperationalAssignmentActor(t, db, actorID)
	repository := NewRepository(db)
	startsOn := time.Date(2026, 8, 2, 8, 0, 0, 0, time.UTC)
	endsOn := startsOn.Add(8 * time.Hour)
	inputs := []OperationalAssignmentInput{
		{ScopeType: "store", ScopeTargetID: "store-1", StartsOn: startsOn},
		{ScopeType: "area", ScopeTargetID: "area-1", StartsOn: startsOn},
		{ScopeType: "partner", ScopeTargetID: "partner-1", StartsOn: startsOn},
		{ScopeType: "shift", ScopeTargetID: "shift-1", StartsOn: startsOn, EndsOn: &endsOn},
	}

	scopes, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", inputs, requestingActor, firstCorrelation,
	)
	if err != nil {
		t.Fatalf("set operational scopes: %v", err)
	}
	if len(scopes.StoreIDs) != 1 || len(scopes.ServiceAreaCodes) != 1 || len(scopes.PartnerIDs) != 1 || len(scopes.ShiftCodes) != 1 {
		t.Fatalf("scope projection lost an assignment family: %#v", scopes)
	}

	reordered := []OperationalAssignmentInput{inputs[3], inputs[1], inputs[0], inputs[2]}
	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", reordered, requestingActor, firstCorrelation,
	); err != nil {
		t.Fatalf("exact reordered replay must be idempotent: %v", err)
	}
	different := []OperationalAssignmentInput{{ScopeType: "store", ScopeTargetID: "store-2", StartsOn: startsOn}}
	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", different, requestingActor, firstCorrelation,
	); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("correlation reuse with different scopes must conflict, got %v", err)
	}

	foreign, err := repository.GetOperationalScopes(context.Background(), actorID, foreignContext, "field")
	if err != nil {
		t.Fatalf("read foreign context: %v", err)
	}
	if len(foreign.StoreIDs)+len(foreign.ServiceAreaCodes)+len(foreign.PartnerIDs)+len(foreign.ShiftCodes) != 0 {
		t.Fatalf("cross-context assignment leak: %#v", foreign)
	}

	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", different, requestingActor, "assignments-crosscut-2",
	); err != nil {
		t.Fatalf("replace operational scopes: %v", err)
	}
	readback, err := repository.GetOperationalScopes(context.Background(), actorID, operatorContext, "field")
	if err != nil || len(readback.StoreIDs) != 1 || readback.StoreIDs[0] != "store-2" {
		t.Fatalf("replacement readback mismatch: %#v err=%v", readback, err)
	}

	var auditCount, activeCount int
	if err := db.QueryRow(`SELECT count(*) FROM workforce_operational_assignment_audit WHERE actor_id = $1`, actorID).Scan(&auditCount); err != nil {
		t.Fatalf("count assignment audit: %v", err)
	}
	if err := db.QueryRow(`SELECT count(*) FROM workforce_operational_assignments WHERE actor_id = $1 AND active`, actorID).Scan(&activeCount); err != nil {
		t.Fatalf("count active assignments: %v", err)
	}
	if auditCount != 2 || activeCount != 1 {
		t.Fatalf("durable assignment counts mismatch: audit=%d active=%d", auditCount, activeCount)
	}
}

func TestOperationalAssignmentsConcurrentExactReplayDBIntegration(t *testing.T) {
	const actorID = "captain-crosscut-concurrent"
	db := openWorkforceAssignmentsTestDB(t)
	cleanupOperationalAssignmentActor(t, db, actorID)
	db.SetMaxOpenConns(12)
	repository := NewRepository(db)
	inputs := []OperationalAssignmentInput{{
		ScopeType: "area", ScopeTargetID: "area-concurrent", StartsOn: time.Date(2026, 8, 2, 9, 0, 0, 0, time.UTC),
	}}

	const callers = 8
	errorsCh := make(chan error, callers)
	var waitGroup sync.WaitGroup
	for index := 0; index < callers; index++ {
		waitGroup.Add(1)
		go func() {
			defer waitGroup.Done()
			_, err := repository.SetOperationalScopes(
				context.Background(), actorID, "crosscut-context", "captain", inputs,
				"operator-crosscut", "assignments-concurrent",
			)
			if err != nil {
				errorsCh <- err
			}
		}()
	}
	waitGroup.Wait()
	close(errorsCh)
	for err := range errorsCh {
		t.Errorf("concurrent exact replay failed: %v", err)
	}
	var auditCount, activeCount int
	_ = db.QueryRow(`SELECT count(*) FROM workforce_operational_assignment_audit WHERE actor_id = $1`, actorID).Scan(&auditCount)
	_ = db.QueryRow(`SELECT count(*) FROM workforce_operational_assignments WHERE actor_id = $1 AND active`, actorID).Scan(&activeCount)
	if auditCount != 1 || activeCount != 1 {
		t.Fatalf("concurrent replay produced duplicate effects: audit=%d active=%d", auditCount, activeCount)
	}
}
