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

func provisionAssignmentActor(t *testing.T, db *sql.DB, actorID, operatorContext, kind string) {
	t.Helper()
	clean := func() {
		if _, err := db.Exec(`DELETE FROM workforce_operational_assignment_audit WHERE actor_id = $1`, actorID); err != nil {
			t.Errorf("clean assignment audit: %v", err)
		}
		if _, err := db.Exec(`DELETE FROM workforce_operational_assignments WHERE actor_id = $1`, actorID); err != nil {
			t.Errorf("clean assignments: %v", err)
		}
		if _, err := db.Exec(`DELETE FROM workforce_people WHERE actor_id = $1`, actorID); err != nil {
			t.Errorf("clean assignment actor: %v", err)
		}
	}
	clean()
	engagementType := "independent_contractor"
	if kind == "employee" {
		engagementType = "employee"
	}
	if _, err := db.Exec(`
		INSERT INTO workforce_people(
			operator_context_id, actor_id, full_name_ar, workforce_code, workforce_kind,
			engagement_type, engagement_status
		)
		VALUES($1, $2, $3, $4, $5, $6, 'active')`,
		operatorContext, actorID, "ممثل اختبار", "TEST-"+actorID, kind, engagementType); err != nil {
		t.Fatalf("provision assignment actor: %v", err)
	}
	t.Cleanup(clean)
}

func provisionAssignmentShift(t *testing.T, db *sql.DB, code string) {
	t.Helper()
	if _, err := db.Exec(`
		INSERT INTO workforce_shifts(code, name_ar, active)
		VALUES($1, $2, true)
		ON CONFLICT(code) DO UPDATE SET name_ar = EXCLUDED.name_ar, active = true`, code, "وردية اختبار"); err != nil {
		t.Fatalf("provision assignment shift: %v", err)
	}
	t.Cleanup(func() {
		if _, err := db.Exec(`DELETE FROM workforce_shifts WHERE code = $1`, code); err != nil {
			t.Errorf("clean assignment shift: %v", err)
		}
	})
}

func TestOperationalAssignmentsTrustedIsolationAndIdempotencyDBIntegration(t *testing.T) {
	const (
		actorID          = "field-crosscut-assignments"
		operatorContext  = "crosscut-context"
		foreignContext   = "crosscut-foreign"
		requestingActor  = "operator-crosscut"
		firstCorrelation = "assignments-crosscut-1"
		shiftCode        = "shift-crosscut-assignments"
	)
	db := openWorkforceAssignmentsTestDB(t)
	provisionAssignmentActor(t, db, actorID, operatorContext, "field")
	provisionAssignmentShift(t, db, shiftCode)
	repository := NewRepository(db)
	startsOn := time.Date(2026, 8, 2, 8, 0, 0, 0, time.UTC)
	endsOn := startsOn.Add(8 * time.Hour)
	inputs := []OperationalAssignmentInput{
		{ScopeType: "store", ScopeTargetID: "store-1", StartsOn: startsOn},
		{ScopeType: "area", ScopeTargetID: "area-1", StartsOn: startsOn},
		{ScopeType: "partner", ScopeTargetID: "partner-1", StartsOn: startsOn},
		{ScopeType: "shift", ScopeTargetID: shiftCode, StartsOn: startsOn, EndsOn: &endsOn},
	}

	scopes, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", inputs, requestingActor, firstCorrelation,
	)
	if err != nil {
		t.Fatalf("set operational scopes: %v", err)
	}
	if len(scopes.StoreIDs) != 1 || len(scopes.ServiceAreaCodes) != 1 || len(scopes.PartnerIDs) != 1 || len(scopes.ShiftCodes) != 1 || scopes.ShiftCodes[0] != shiftCode {
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
		context.Background(), actorID, foreignContext, "field", different, requestingActor, "assignments-context-mismatch",
	); err == nil {
		t.Fatal("foreign OperatorContext must not be able to persist an affiliation")
	}
	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "captain", different, requestingActor, "assignments-kind-mismatch",
	); err == nil {
		t.Fatal("workforce kind mismatch must not be able to persist an affiliation")
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

func TestOperationalShiftAffiliationRequiresActiveWorkforceReferenceDBIntegration(t *testing.T) {
	const (
		actorID         = "field-crosscut-shift-integrity"
		operatorContext = "crosscut-context"
		requestingActor = "operator-crosscut"
		shiftCode       = "shift-crosscut-integrity"
	)
	db := openWorkforceAssignmentsTestDB(t)
	provisionAssignmentActor(t, db, actorID, operatorContext, "field")
	provisionAssignmentShift(t, db, shiftCode)
	repository := NewRepository(db)
	startsOn := time.Date(2026, 8, 2, 10, 0, 0, 0, time.UTC)
	input := []OperationalAssignmentInput{{ScopeType: "shift", ScopeTargetID: shiftCode, StartsOn: startsOn}}

	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", input, requestingActor, "assignments-shift-active",
	); err != nil {
		t.Fatalf("set active shift affiliation: %v", err)
	}
	if _, err := db.Exec(`UPDATE workforce_shifts SET active = false WHERE code = $1`, shiftCode); err != nil {
		t.Fatalf("disable shift: %v", err)
	}

	scopes, err := repository.GetOperationalScopes(context.Background(), actorID, operatorContext, "field")
	if err != nil {
		t.Fatalf("read scopes after shift disable: %v", err)
	}
	if len(scopes.ShiftCodes) != 0 {
		t.Fatalf("disabled shift must not remain effective: %#v", scopes.ShiftCodes)
	}
	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", input, requestingActor, "assignments-shift-disabled",
	); !errors.Is(err, ErrInvalidReference) {
		t.Fatalf("disabled shift must be rejected, got %v", err)
	}
	unknown := []OperationalAssignmentInput{{ScopeType: "shift", ScopeTargetID: "shift-does-not-exist", StartsOn: startsOn}}
	if _, err := repository.SetOperationalScopes(
		context.Background(), actorID, operatorContext, "field", unknown, requestingActor, "assignments-shift-unknown",
	); !errors.Is(err, ErrInvalidReference) {
		t.Fatalf("unknown shift must be rejected, got %v", err)
	}
}

func TestOperationalAssignmentsConcurrentExactReplayDBIntegration(t *testing.T) {
	const (
		actorID         = "captain-crosscut-concurrent"
		operatorContext = "crosscut-context"
	)
	db := openWorkforceAssignmentsTestDB(t)
	provisionAssignmentActor(t, db, actorID, operatorContext, "captain")
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
				context.Background(), actorID, operatorContext, "captain", inputs,
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
