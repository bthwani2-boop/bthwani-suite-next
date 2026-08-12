package payout

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

// completePayout drives the governed completion route the way the control
// panel does.
func completePayout(t *testing.T, db *sql.DB, operatorContextID, payoutID, operatorID string) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"operatorId": operatorID})
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", bytes.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("X-Correlation-ID", "complete-"+payoutID)
	res := httptest.NewRecorder()
	HandleCompletePayoutRequestSovereign(db)(res, req)
	return res
}

func payoutStatus(t *testing.T, db *sql.DB, operatorContextID, payoutID string) string {
	t.Helper()
	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payout_requests WHERE id=$1 AND operator_context_id=$2`,
		payoutID, operatorContextID).Scan(&status); err != nil {
		t.Fatalf("read payout status: %v", err)
	}
	return status
}

// TestManualSettlementReachesCompletion is the reachability proof for the
// governed Cash-Out journey.
//
// Before this lifecycle existed the payout state machine had no reachable
// terminal state at all: provider submission answered 403 unconditionally,
// completion required status='processing', and nothing in the service ever
// wrote that status. Approved payouts stayed approved forever with their funds
// held, while the batch/freeze/evidence chain wrote records that advanced
// nothing. A test that only asserted the individual handlers would not have
// caught that, so this one walks the whole path and asserts the money actually
// moves.
func TestManualSettlementReachesCompletion(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "lifecycle-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })

	const balance int64 = 100000
	const payoutAmount int64 = 25000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)

	destination := executeDestinationUpsert(t, db, operatorContextID, actorID, "lifecycle-corr")
	createRes := executePayoutCreate(t, db, operatorContextID, actorID, destination.ID,
		"lifecycle-payout-"+operatorContextID, payoutAmount)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("payout create returned %d: %s", createRes.Code, createRes.Body.String())
	}
	payoutID := payoutIDFromResponse(t, createRes)

	// The request placed a hold, so the amount is no longer spendable but is
	// not yet paid.
	var available, held, paid int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units,paid_total_minor_units
		FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`,
		operatorContextID, actorID).Scan(&available, &held, &paid); err != nil {
		t.Fatal(err)
	}
	if held != payoutAmount || available != balance-payoutAmount {
		t.Fatalf("after request: available=%d held=%d, want available=%d held=%d",
			available, held, balance-payoutAmount, payoutAmount)
	}

	if res := approvePayout(t, db, operatorContextID, payoutID, "finance-approver"); res.Code != http.StatusOK {
		t.Fatalf("approve returned %d: %s", res.Code, res.Body.String())
	}

	var snapshotID string
	if err := db.QueryRow(`SELECT id FROM wlt_approved_payout_snapshots
		WHERE operator_context_id=$1 AND payout_request_id=$2`, operatorContextID, payoutID).Scan(&snapshotID); err != nil {
		t.Fatalf("read approved snapshot: %v", err)
	}

	batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)
	externalReference := testsupport.UniqueID("official-wallet-ref")

	// Completion is refused while the transfer is only approved.
	if res := completePayout(t, db, operatorContextID, payoutID, "finance-closer"); res.Code != http.StatusConflict {
		t.Fatalf("completion before execution returned %d, want 409: %s", res.Code, res.Body.String())
	}

	evidence, err := RecordManualTransferExecution(ctx, db, batchID, RecordManualExecutionInput{
		ApprovedSnapshotID:        snapshotID,
		ExternalTransferReference: externalReference,
		AmountMinorUnits:          payoutAmount,
		Currency:                  "YER",
		OperatorID:                "finance-executor",
	}, "execute-corr")
	if err != nil {
		t.Fatalf("record manual execution: %v", err)
	}
	if evidence.VerifiedAt != nil {
		t.Fatal("execution must not verify itself")
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "executed" {
		t.Fatalf("payout status after execution = %q, want executed", got)
	}

	// Completion is still refused while verification is outstanding.
	if res := completePayout(t, db, operatorContextID, payoutID, "finance-closer"); res.Code != http.StatusConflict {
		t.Fatalf("completion before verification returned %d, want 409: %s", res.Code, res.Body.String())
	}

	// The executor cannot verify their own transfer.
	if _, err := VerifyManualTransferExecution(ctx, db, batchID, evidence.ID,
		VerifyManualExecutionInput{OperatorID: "finance-executor"}, "verify-corr"); !errors.Is(err, ErrSeparationOfDuties) {
		t.Fatalf("expected self-verification to be refused, got %v", err)
	}

	verified, err := VerifyManualTransferExecution(ctx, db, batchID, evidence.ID,
		VerifyManualExecutionInput{OperatorID: "finance-verifier"}, "verify-corr")
	if err != nil {
		t.Fatalf("verify manual execution: %v", err)
	}
	if verified.VerifiedAt == nil {
		t.Fatal("verification did not stamp verified_at")
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "verified" {
		t.Fatalf("payout status after verification = %q, want verified", got)
	}

	completeRes := completePayout(t, db, operatorContextID, payoutID, "finance-closer")
	if completeRes.Code != http.StatusOK {
		t.Fatalf("completion returned %d: %s", completeRes.Code, completeRes.Body.String())
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "completed" {
		t.Fatalf("payout status after completion = %q, want completed", got)
	}

	// The hold is released into paid, not back into spendable balance.
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units,paid_total_minor_units
		FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`,
		operatorContextID, actorID).Scan(&available, &held, &paid); err != nil {
		t.Fatal(err)
	}
	if held != 0 || paid != payoutAmount || available != balance-payoutAmount {
		t.Fatalf("after completion: available=%d held=%d paid=%d, want available=%d held=0 paid=%d",
			available, held, paid, balance-payoutAmount, payoutAmount)
	}

	// Completion is carried into the canonical double-entry ledger.
	var lineCount int
	if err := db.QueryRow(`SELECT COUNT(*)
		FROM wlt_ledger_transactions t
		JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
		WHERE t.operator_context_id=$1 AND t.transaction_type='payout_completed' AND t.reference_id=$2`,
		operatorContextID, payoutID).Scan(&lineCount); err != nil {
		t.Fatal(err)
	}
	if lineCount != 2 {
		t.Fatalf("expected a balanced two-line payout_completed transaction, got %d lines", lineCount)
	}
}

// TestDuplicateExternalReferenceIsRefused proves one external transfer
// reference cannot be reused to evidence a second payout.
func TestDuplicateExternalReferenceIsRefused(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "lifecycle-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })

	const balance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)

	destination := executeDestinationUpsert(t, db, operatorContextID, actorID, "dup-corr")
	sharedReference := testsupport.UniqueID("reused-external-ref")
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)

	var firstErr error
	for i, idempotencyKey := range []string{"dup-payout-a-" + operatorContextID, "dup-payout-b-" + operatorContextID} {
		createRes := executePayoutCreate(t, db, operatorContextID, actorID, destination.ID, idempotencyKey, 10000)
		if createRes.Code != http.StatusCreated {
			t.Fatalf("payout create %d returned %d: %s", i, createRes.Code, createRes.Body.String())
		}
		payoutID := payoutIDFromResponse(t, createRes)
		if res := approvePayout(t, db, operatorContextID, payoutID, "finance-approver"); res.Code != http.StatusOK {
			t.Fatalf("approve %d returned %d: %s", i, res.Code, res.Body.String())
		}
		var snapshotID string
		if err := db.QueryRow(`SELECT id FROM wlt_approved_payout_snapshots
			WHERE operator_context_id=$1 AND payout_request_id=$2`, operatorContextID, payoutID).Scan(&snapshotID); err != nil {
			t.Fatalf("read snapshot %d: %v", i, err)
		}
		batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
		_, firstErr = RecordManualTransferExecution(ctx, db, batchID, RecordManualExecutionInput{
			ApprovedSnapshotID:        snapshotID,
			ExternalTransferReference: sharedReference,
			AmountMinorUnits:          10000,
			Currency:                  "YER",
			OperatorID:                "finance-executor",
		}, "dup-exec-corr")
		if i == 0 && firstErr != nil {
			t.Fatalf("first execution should succeed: %v", firstErr)
		}
	}
	if !errors.Is(firstErr, ErrDuplicateExternalReference) {
		t.Fatalf("expected the reused external reference to be refused, got %v", firstErr)
	}
}
