package payout

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"wlt-api/internal/shared"
	"wlt-api/internal/testsupport"
)

func completePayout(t *testing.T, db *sql.DB, operatorContextID, payoutID, operatorID string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/complete", bytes.NewReader([]byte(`{}`)))
	ctx := shared.WithOperatorContext(req.Context(), operatorContextID)
	req = req.WithContext(shared.WithDelegatedFinancePrincipal(ctx, operatorID))
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("X-Correlation-ID", "complete-"+payoutID)
	res := httptest.NewRecorder()
	HandleCompletePayoutRequestSovereign(db)(res, req)
	return res
}

func fixtureSHA256(value string) string {
	sum := sha256.Sum256([]byte(value))
	return fmt.Sprintf("%x", sum)
}

func reconcilePayoutWithAuthoritativeStatement(t *testing.T, db *sql.DB, operatorContextID, payoutID, destinationID, externalReference string, amount int64) {
	t.Helper()
	var destinationHash string
	if err := db.QueryRow(`SELECT material_identity_hash FROM wlt_payout_destinations WHERE operator_context_id=$1 AND id=$2`, operatorContextID, destinationID).Scan(&destinationHash); err != nil {
		t.Fatalf("read payout destination hash: %v", err)
	}
	reconcilerCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-reconciler")
	account, err := RegisterExternalProviderAccount(reconcilerCtx, db, "test-provider", fixtureSHA256("account:"+operatorContextID), ExternalProviderAccountInput{Currency: "YER"})
	if err != nil {
		t.Fatalf("register external provider account: %v", err)
	}
	statementInput := ImportAuthoritativeStatementInput{
		ExternalProviderAccountID: account.ID,
		StatementReference:        "statement-" + payoutID,
		BusinessDate:              time.Now().UTC().Format(time.DateOnly),
		Currency:                  "YER",
		Lines: []AuthoritativeStatementLineInput{{
			ExternalTransferReference: externalReference,
			Direction:                 "outgoing",
			AmountMinorUnits:          amount,
			Currency:                  "YER",
			DestinationReferenceHash:  destinationHash,
			SourceRecord:              map[string]any{"fixture": "authoritative"},
		}},
	}
	businessDate, err := time.Parse(time.DateOnly, statementInput.BusinessDate)
	if err != nil {
		t.Fatalf("parse fixture business date: %v", err)
	}
	statementInput.ArtifactSHA256, err = canonicalStatementArtifactSHA256(statementInput, businessDate)
	if err != nil {
		t.Fatalf("compute fixture artifact hash: %v", err)
	}
	statement, err := ImportAuthoritativeStatement(reconcilerCtx, db, statementInput)
	if err != nil {
		t.Fatalf("import authoritative statement: %v", err)
	}
	var statementLineID string
	if err := db.QueryRow(`SELECT id FROM wlt_external_provider_statement_lines WHERE operator_context_id=$1 AND statement_id=$2 AND external_transfer_reference=$3`, operatorContextID, statement.ID, externalReference).Scan(&statementLineID); err != nil {
		t.Fatalf("read authoritative statement line: %v", err)
	}
	reconciliation, err := ReconcilePayoutFourWay(reconcilerCtx, db, payoutID, ReconcilePayoutFourWayInput{StatementLineID: statementLineID}, "reconcile-"+payoutID)
	if err != nil {
		t.Fatalf("reconcile payout four-way: %v", err)
	}
	if reconciliation.Result != "MATCHED" {
		t.Fatalf("four-way reconciliation result=%s, want MATCHED", reconciliation.Result)
	}
}

func payoutStatus(t *testing.T, db *sql.DB, operatorContextID, payoutID string) string {
	t.Helper()
	var status string
	if err := db.QueryRow(`SELECT status FROM wlt_payout_requests WHERE id=$1 AND operator_context_id=$2`, payoutID, operatorContextID).Scan(&status); err != nil {
		t.Fatalf("read payout status: %v", err)
	}
	return status
}

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
	createRes := executePayoutCreate(t, db, operatorContextID, actorID, "lifecycle-payout-"+operatorContextID, payoutAmount)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("payout create returned %d: %s", createRes.Code, createRes.Body.String())
	}
	payoutID := payoutIDFromResponse(t, createRes)

	var available, pending, paid int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units,paid_total_minor_units
		FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &pending, &paid); err != nil {
		t.Fatal(err)
	}
	if pending != payoutAmount || available != balance-payoutAmount || paid != 0 {
		t.Fatalf("after request: available=%d pending=%d paid=%d, want available=%d pending=%d paid=0", available, pending, paid, balance-payoutAmount, payoutAmount)
	}

	if res := approvePayout(t, db, operatorContextID, payoutID, "finance-approver"); res.Code != http.StatusOK {
		t.Fatalf("approve returned %d: %s", res.Code, res.Body.String())
	}
	var snapshotID string
	if err := db.QueryRow(`SELECT id FROM wlt_approved_payout_snapshots WHERE operator_context_id=$1 AND payout_request_id=$2`, operatorContextID, payoutID).Scan(&snapshotID); err != nil {
		t.Fatalf("read approved snapshot: %v", err)
	}
	batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
	executorCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-executor")
	externalReference := testsupport.UniqueID("official-wallet-ref")

	if res := completePayout(t, db, operatorContextID, payoutID, "finance-closer"); res.Code != http.StatusConflict {
		t.Fatalf("completion before execution returned %d, want 409: %s", res.Code, res.Body.String())
	}
	evidence, err := RecordManualTransferExecution(executorCtx, db, batchID, RecordManualExecutionInput{
		ApprovedSnapshotID:        snapshotID,
		ExternalTransferReference: externalReference,
		EvidenceReference:         "proof:" + externalReference,
	}, "execute-corr")
	if err != nil {
		t.Fatalf("record manual execution: %v", err)
	}
	if evidence.AmountMinorUnits != payoutAmount || evidence.Currency != "YER" {
		t.Fatalf("execution evidence must derive snapshot money; got amount=%d currency=%s", evidence.AmountMinorUnits, evidence.Currency)
	}
	if evidence.VerifiedAt != nil {
		t.Fatal("execution must not verify itself")
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "executed" {
		t.Fatalf("payout status after execution = %q, want executed", got)
	}

	if res := completePayout(t, db, operatorContextID, payoutID, "finance-closer"); res.Code != http.StatusConflict {
		t.Fatalf("completion before verification returned %d, want 409: %s", res.Code, res.Body.String())
	}
	if _, err := VerifyManualTransferExecution(executorCtx, db, batchID, evidence.ID, VerifyManualExecutionInput{}, "verify-corr"); !errors.Is(err, ErrSeparationOfDuties) {
		t.Fatalf("expected self-verification to be refused, got %v", err)
	}
	verifierCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-verifier")
	verified, err := VerifyManualTransferExecution(verifierCtx, db, batchID, evidence.ID, VerifyManualExecutionInput{}, "verify-corr")
	if err != nil {
		t.Fatalf("verify manual execution: %v", err)
	}
	if verified.VerifiedAt == nil {
		t.Fatal("verification did not stamp verified_at")
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "verified" {
		t.Fatalf("payout status after verification = %q, want verified", got)
	}
	reconcilePayoutWithAuthoritativeStatement(t, db, operatorContextID, payoutID, destination.ID, externalReference, payoutAmount)

	completeRes := completePayout(t, db, operatorContextID, payoutID, "finance-closer")
	if completeRes.Code != http.StatusOK {
		t.Fatalf("completion returned %d: %s", completeRes.Code, completeRes.Body.String())
	}
	if got := payoutStatus(t, db, operatorContextID, payoutID); got != "completed" {
		t.Fatalf("payout status after completion = %q, want completed", got)
	}

	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units,paid_total_minor_units
		FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &pending, &paid); err != nil {
		t.Fatal(err)
	}
	if pending != 0 || paid != payoutAmount || available != balance-payoutAmount {
		t.Fatalf("after completion: available=%d pending=%d paid=%d, want available=%d pending=0 paid=%d", available, pending, paid, balance-payoutAmount, payoutAmount)
	}

	var lineCount int
	if err := db.QueryRow(`SELECT COUNT(*) FROM wlt_ledger_transactions t JOIN wlt_ledger_lines l ON l.ledger_transaction_id = t.id
		WHERE t.operator_context_id=$1 AND t.transaction_type='payout_completed' AND t.reference_id=$2`, operatorContextID, payoutID).Scan(&lineCount); err != nil {
		t.Fatal(err)
	}
	if lineCount != 2 {
		t.Fatalf("expected a balanced two-line payout_completed transaction, got %d lines", lineCount)
	}
}

func TestRejectedPayoutReleasesPendingReservationWithoutPaidCounter(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "lifecycle-test-key-32-bytes-long")
	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	const balance int64 = 50000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)
	executeDestinationUpsert(t, db, operatorContextID, actorID, "reject-corr")
	created := executePayoutCreate(t, db, operatorContextID, actorID, "reject-payout-"+operatorContextID, 15000)
	if created.Code != http.StatusCreated {
		t.Fatalf("create returned %d: %s", created.Code, created.Body.String())
	}
	payoutID := payoutIDFromResponse(t, created)
	if res := rejectPayoutForLifecycle(t, db, operatorContextID, payoutID, "finance-rejector"); res.Code != http.StatusOK {
		t.Fatalf("reject returned %d: %s", res.Code, res.Body.String())
	}
	var available, pending, paid int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units,paid_total_minor_units FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &pending, &paid); err != nil {
		t.Fatal(err)
	}
	if available != balance || pending != 0 || paid != 0 {
		t.Fatalf("rejection state available=%d pending=%d paid=%d", available, pending, paid)
	}
}

func rejectPayoutForLifecycle(t *testing.T, db *sql.DB, operatorContextID, payoutID, operatorID string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests/"+payoutID+"/reject", bytes.NewReader([]byte(`{}`)))
	ctx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(req.Context(), operatorContextID), operatorID)
	req = req.WithContext(ctx)
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("X-Correlation-ID", "reject-"+payoutID)
	res := httptest.NewRecorder()
	HandleRejectPayoutRequestSovereign(db)(res, req)
	return res
}

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
	executeDestinationUpsert(t, db, operatorContextID, actorID, "dup-corr")
	sharedReference := testsupport.UniqueID("reused-external-ref")
	executorCtx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-executor")

	var firstErr error
	for i, idempotencyKey := range []string{"dup-payout-a-" + operatorContextID, "dup-payout-b-" + operatorContextID} {
		createRes := executePayoutCreate(t, db, operatorContextID, actorID, idempotencyKey, 10000)
		if createRes.Code != http.StatusCreated {
			t.Fatalf("payout create %d returned %d: %s", i, createRes.Code, createRes.Body.String())
		}
		payoutID := payoutIDFromResponse(t, createRes)
		if res := approvePayout(t, db, operatorContextID, payoutID, "finance-approver"); res.Code != http.StatusOK {
			t.Fatalf("approve %d returned %d: %s", i, res.Code, res.Body.String())
		}
		var snapshotID string
		if err := db.QueryRow(`SELECT id FROM wlt_approved_payout_snapshots WHERE operator_context_id=$1 AND payout_request_id=$2`, operatorContextID, payoutID).Scan(&snapshotID); err != nil {
			t.Fatalf("read snapshot %d: %v", i, err)
		}
		batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
		_, firstErr = RecordManualTransferExecution(executorCtx, db, batchID, RecordManualExecutionInput{
			ApprovedSnapshotID:        snapshotID,
			ExternalTransferReference: sharedReference,
			EvidenceReference:         "proof:" + sharedReference,
		}, "dup-exec-corr")
		if i == 0 && firstErr != nil {
			t.Fatalf("first execution should succeed: %v", firstErr)
		}
	}
	if !errors.Is(firstErr, ErrDuplicateExternalReference) {
		t.Fatalf("expected the reused external reference to be refused, got %v", firstErr)
	}
}
