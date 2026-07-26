package fieldreadiness

import (
	"context"
	"database/sql"
	"errors"
	"testing"
)

func testMutationContext(t *testing.T, key string, request any) MutationContext {
	t.Helper()
	mutation, err := BuildMutationContext(key, key+":correlation", request)
	if err != nil {
		t.Fatalf("build mutation context: %v", err)
	}
	return mutation
}

func cleanupFieldMutationReceipts(t *testing.T, db *sql.DB, actorID string) {
	t.Helper()
	t.Cleanup(func() {
		_, _ = db.ExecContext(
			context.Background(),
			`DELETE FROM dsh_field_readiness_operation_receipts WHERE actor_id = $1`,
			actorID,
		)
	})
}

func TestCreateGovernedVisitIdempotentReturnsOriginalVisitAndRejectsConflict(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-idempotent-visit")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-idempotent-visit")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := testFieldActor(t, agentID)
	cleanupFieldMutationReceipts(t, db, agentID)

	input := CreateVisitInput{
		StoreID:       storeID,
		FieldAgentID:  agentID,
		VisitType:     VisitTypeOnboarding,
		StartLocation: testValidLocation(),
	}
	key := uniqueID("create-visit-idempotency")
	mutation := testMutationContext(t, key, struct {
		StoreID string
		Input   CreateVisitInput
	}{StoreID: storeID, Input: input})

	first, err := CreateGovernedVisitIdempotent(ctx, db, actor, input, mutation)
	if err != nil {
		t.Fatalf("first create governed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, first.ID) })
	second, err := CreateGovernedVisitIdempotent(ctx, db, actor, input, mutation)
	if err != nil {
		t.Fatalf("replay create governed visit: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected replay to return visit %s, got %s", first.ID, second.ID)
	}

	conflictMutation := testMutationContext(t, key, map[string]any{
		"storeId": storeID,
		"visitType": "periodic",
	})
	if _, err := CreateGovernedVisitIdempotent(ctx, db, actor, input, conflictMutation); !errors.Is(err, ErrIdempotencyConflict) {
		t.Fatalf("expected ErrIdempotencyConflict, got %v", err)
	}

	var count int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_field_visits
		WHERE field_agent_id = $1 AND create_idempotency_key = $2`,
		agentID,
		mutation.IdempotencyKey,
	).Scan(&count); err != nil {
		t.Fatalf("count idempotent visits: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one visit for the idempotency key, got %d", count)
	}
}

func TestGovernedCheckReceiptDoesNotReapplyAnOlderMutation(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-idempotent-check")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-idempotent-check")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := testFieldActor(t, agentID)
	cleanupFieldMutationReceipts(t, db, agentID)

	visit, err := CreateGovernedVisit(ctx, db, actor, CreateVisitInput{
		StoreID: storeID, FieldAgentID: agentID, VisitType: VisitTypeOnboarding, StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create governed visit: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID) })
	evidence := seedStoreBoundReadinessMedia(t, db, partnerID, storeID, agentID)

	passedInput := UpdateCheckInput{
		CheckType: "location_verified", Status: CheckPassed, EvidenceURL: evidence, Notes: "verified",
	}
	passedMutation := testMutationContext(t, uniqueID("check-pass"), struct {
		VisitID string
		Input   UpdateCheckInput
	}{VisitID: visit.ID, Input: passedInput})
	passed, err := UpsertGovernedReadinessCheckIdempotent(ctx, db, actor, visit.ID, passedInput, passedMutation)
	if err != nil {
		t.Fatalf("record passed check: %v", err)
	}

	failedInput := UpdateCheckInput{
		CheckType: "location_verified", Status: CheckFailed, Notes: "newer failed observation",
	}
	failedMutation := testMutationContext(t, uniqueID("check-fail"), struct {
		VisitID string
		Input   UpdateCheckInput
	}{VisitID: visit.ID, Input: failedInput})
	if _, err := UpsertGovernedReadinessCheckIdempotent(ctx, db, actor, visit.ID, failedInput, failedMutation); err != nil {
		t.Fatalf("record newer failed check: %v", err)
	}

	replayed, err := UpsertGovernedReadinessCheckIdempotent(ctx, db, actor, visit.ID, passedInput, passedMutation)
	if err != nil {
		t.Fatalf("replay older passed check: %v", err)
	}
	if replayed.ID != passed.ID || replayed.Status != CheckPassed {
		t.Fatalf("expected original passed receipt, got %#v", replayed)
	}

	var currentStatus CheckStatus
	if err := db.QueryRowContext(ctx, `
		SELECT status FROM dsh_readiness_checks
		WHERE visit_id = $1 AND check_type = 'location_verified'`,
		visit.ID,
	).Scan(&currentStatus); err != nil {
		t.Fatalf("read current check status: %v", err)
	}
	if currentStatus != CheckFailed {
		t.Fatalf("older replay must not overwrite newer state; got %s", currentStatus)
	}
}

func TestCreateGovernedEscalationIdempotentCreatesOneEscalation(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-idempotent-escalation")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-idempotent-escalation")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := testFieldActor(t, agentID)
	cleanupFieldMutationReceipts(t, db, agentID)

	input := CreateEscalationInput{
		StoreID: storeID, RaisedBy: agentID, Severity: SeverityHigh,
		Category: CategorySafetyViolation, Description: "idempotent safety escalation",
	}
	mutation := testMutationContext(t, uniqueID("create-escalation"), input)
	first, err := CreateGovernedEscalationIdempotent(ctx, db, actor, input, mutation)
	if err != nil {
		t.Fatalf("first escalation: %v", err)
	}
	t.Cleanup(func() { _, _ = db.ExecContext(ctx, `DELETE FROM dsh_readiness_escalations WHERE id = $1`, first.ID) })
	second, err := CreateGovernedEscalationIdempotent(ctx, db, actor, input, mutation)
	if err != nil {
		t.Fatalf("replay escalation: %v", err)
	}
	if second.ID != first.ID {
		t.Fatalf("expected replay to return escalation %s, got %s", first.ID, second.ID)
	}

	var count int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_readiness_escalations
		WHERE raised_by = $1 AND create_idempotency_key = $2`,
		agentID,
		mutation.IdempotencyKey,
	).Scan(&count); err != nil {
		t.Fatalf("count idempotent escalations: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one escalation for the idempotency key, got %d", count)
	}
}

func TestCompleteGovernedVisitIdempotentDoesNotDuplicateCommissionOutbox(t *testing.T) {
	db := openRequiredDB(t)
	ctx := context.Background()
	agentID := uniqueID("agent-idempotent-complete")
	partnerID := seedPartner(t, db, agentID)
	storeID := uniqueID("store-idempotent-complete")
	seedFieldStore(t, db, storeID, agentID)
	registerGovernedStoreLocation(t, db, storeID, partnerID)
	actor := testFieldActor(t, agentID)
	cleanupFieldMutationReceipts(t, db, agentID)

	visit, err := CreateGovernedVisit(ctx, db, actor, CreateVisitInput{
		StoreID: storeID, FieldAgentID: agentID, VisitType: VisitTypeOnboarding, StartLocation: testValidLocation(),
	})
	if err != nil {
		t.Fatalf("create governed visit: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_commission_outbox WHERE visit_id = $1`, visit.ID)
		_, _ = db.ExecContext(ctx, `DELETE FROM dsh_field_visits WHERE id = $1`, visit.ID)
	})
	for _, checkType := range RequiredCheckTypes {
		mediaRef := seedStoreBoundReadinessMedia(t, db, partnerID, storeID, agentID)
		if _, err := UpsertGovernedReadinessCheck(ctx, db, actor, visit.ID, UpdateCheckInput{
			CheckType: checkType, Status: CheckPassed, EvidenceURL: mediaRef,
		}); err != nil {
			t.Fatalf("upsert governed check %s: %v", checkType, err)
		}
	}

	completion := testCompleteInput()
	mutation := testMutationContext(t, uniqueID("complete-visit"), struct {
		VisitID string
		Input   CompleteVisitInput
	}{VisitID: visit.ID, Input: completion})
	first, err := CompleteGovernedVisitIdempotent(ctx, db, actor, visit.ID, completion, mutation)
	if err != nil {
		t.Fatalf("first completion: %v", err)
	}
	second, err := CompleteGovernedVisitIdempotent(ctx, db, actor, visit.ID, completion, mutation)
	if err != nil {
		t.Fatalf("replay completion: %v", err)
	}
	if second.ID != first.ID || second.Status != VisitComplete {
		t.Fatalf("expected replay to return completed visit, got %#v", second)
	}

	var outboxCount int
	if err := db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM dsh_field_commission_outbox WHERE visit_id = $1`,
		visit.ID,
	).Scan(&outboxCount); err != nil {
		t.Fatalf("count commission outbox events: %v", err)
	}
	if outboxCount != 1 {
		t.Fatalf("expected one commission outbox event, got %d", outboxCount)
	}
}
