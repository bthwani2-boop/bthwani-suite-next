package payout

import (
	"testing"

	"wlt-api/internal/shared"
)

func TestFourWayReconciliationReplayDoesNotDuplicateAudit(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "four-way-idempotency-test-key-32")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	const balance int64 = 100000
	const payoutAmount int64 = 10000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)
	destination := executeDestinationUpsert(t, db, operatorContextID, actorID, "four-way-idempotency-destination")
	created := executePayoutCreate(t, db, operatorContextID, actorID, "four-way-idempotency-payout-"+operatorContextID, payoutAmount)
	if created.Code != 201 {
		t.Fatalf("payout create returned %d: %s", created.Code, created.Body.String())
	}
	payoutID := payoutIDFromResponse(t, created)
	if approved := approvePayout(t, db, operatorContextID, payoutID, "finance-approver"); approved.Code != 200 {
		t.Fatalf("payout approval returned %d: %s", approved.Code, approved.Body.String())
	}
	var snapshotID string
	if err := db.QueryRow(`SELECT id FROM wlt_approved_payout_snapshots WHERE operator_context_id=$1 AND payout_request_id=$2`, operatorContextID, payoutID).Scan(&snapshotID); err != nil {
		t.Fatalf("read approved snapshot: %v", err)
	}
	batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
	externalReference := "four-way-idempotency-transfer-" + payoutID
	executionCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-executor")
	evidence, err := RecordManualTransferExecution(executionCtx, db, batchID, RecordManualExecutionInput{
		ApprovedSnapshotID:        snapshotID,
		ExternalTransferReference: externalReference,
		EvidenceReference:         "proof:" + externalReference,
	}, "four-way-execution")
	if err != nil {
		t.Fatalf("record execution: %v", err)
	}
	verificationCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-verifier")
	if _, err := VerifyManualTransferExecution(verificationCtx, db, batchID, evidence.ID, VerifyManualExecutionInput{}, "four-way-verification"); err != nil {
		t.Fatalf("verify execution: %v", err)
	}

	reconcilePayoutWithAuthoritativeStatement(t, db, operatorContextID, payoutID, destination.ID, externalReference, payoutAmount)
	var statementLineID string
	if err := db.QueryRow(`SELECT l.id FROM wlt_external_provider_statement_lines l WHERE l.operator_context_id=$1 AND l.external_transfer_reference=$2`, operatorContextID, externalReference).Scan(&statementLineID); err != nil {
		t.Fatalf("read statement line: %v", err)
	}
	reconcileCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-reconciler")
	replayed, err := ReconcilePayoutFourWay(reconcileCtx, db, payoutID, ReconcilePayoutFourWayInput{StatementLineID: statementLineID}, "four-way-replay")
	if err != nil {
		t.Fatalf("replay reconciliation: %v", err)
	}
	if replayed.Result != "MATCHED" {
		t.Fatalf("replayed reconciliation result=%s, want MATCHED", replayed.Result)
	}
	var auditCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_payout_audit_events WHERE operator_context_id=$1 AND aggregate_type='payout_request' AND aggregate_id=$2 AND action='payout.four_way_reconciled'`, operatorContextID, payoutID).Scan(&auditCount); err != nil {
		t.Fatalf("count reconciliation audits: %v", err)
	}
	if auditCount != 1 {
		t.Fatalf("replaying an immutable reconciliation must not duplicate audit rows, got %d", auditCount)
	}
}
