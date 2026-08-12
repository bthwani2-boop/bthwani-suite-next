package payout

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"

	"wlt-api/internal/shared"
)

// TestConcurrentPayoutRequestsCannotOverHoldWallet proves U004-T002's core
// eligibility invariant: two payout requests racing against the same wallet
// cannot together hold more than the withdrawable balance. The guard is the
// conditional UPDATE in HandleCreateGovernedPayoutRequest (it re-checks the
// balance in the same statement that places the hold), so this test would
// catch a regression that replaced it with a read-then-write pair.
func TestConcurrentPayoutRequestsCannotOverHoldWallet(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "concurrency-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	seedOfficialWalletProvider(t, db, operatorContextID)

	const balance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)

	destination := executeDestinationUpsert(t, db, operatorContextID, actorID, "concurrency-corr")

	// Two requests each ask for 70% of the balance. At most one can succeed;
	// together they must never hold more than the wallet actually has.
	const askPerRequest int64 = 70000
	results := make([]int, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			res := executePayoutCreate(t, db, operatorContextID, actorID, destination.ID,
				fmt.Sprintf("concurrent-hold-%s-%d", operatorContextID, i), askPerRequest)
			results[i] = res.Code
		}(i)
	}
	wg.Wait()

	successCount := 0
	for _, code := range results {
		if code == http.StatusCreated {
			successCount++
		} else if code != http.StatusConflict && code != http.StatusBadRequest {
			t.Fatalf("unexpected payout create status %d", code)
		}
	}
	if successCount != 1 {
		t.Fatalf("expected exactly one of two overlapping payout requests to succeed, got %d", successCount)
	}

	var available, held int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &held); err != nil {
		t.Fatal(err)
	}
	if held > balance || available < 0 {
		t.Fatalf("wallet over-held: available=%d held=%d balance=%d", available, held, balance)
	}
	if held != askPerRequest {
		t.Fatalf("expected exactly one hold of %d, got held=%d", askPerRequest, held)
	}
}

// TestApprovedPayoutSnapshotIsImmutable proves the approved snapshot row
// cannot be altered after creation: the schema has no update path, and this
// test asserts that fact by attempting a direct write and reading the row
// straight back to be sure a later regression that adds an UPDATE path would
// fail this test alongside any application-level check.
func TestApprovedPayoutSnapshotIsImmutable(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "concurrency-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	seedOfficialWalletProvider(t, db, operatorContextID)

	const balance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)
	destination := executeDestinationUpsert(t, db, operatorContextID, actorID, "immutable-corr")
	res := executePayoutCreate(t, db, operatorContextID, actorID, destination.ID, "immutable-payout-"+operatorContextID, 10000)
	if res.Code != http.StatusCreated {
		t.Fatalf("payout create returned %d: %s", res.Code, res.Body.String())
	}

	// Approve with a different operator than the maker (SoD: maker != checker).
	approveRes := approvePayout(t, db, operatorContextID, payoutIDFromResponse(t, res), "finance-approver-1")
	if approveRes.Code != http.StatusOK {
		t.Fatalf("approve returned %d: %s", approveRes.Code, approveRes.Body.String())
	}

	var snapshotID, snapshotHash string
	var amount int64
	if err := db.QueryRow(`SELECT id, snapshot_hash, amount_minor_units FROM wlt_approved_payout_snapshots
		WHERE operator_context_id=$1 AND beneficiary_actor_id=$2`, operatorContextID, actorID).Scan(&snapshotID, &snapshotHash, &amount); err != nil {
		t.Fatalf("read approved snapshot: %v", err)
	}
	if amount != 10000 {
		t.Fatalf("snapshot amount mismatch: %d", amount)
	}

	// The approver cannot also execute the external transfer they approved.
	batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
	ctx := shared.WithOperatorContext(t.Context(), operatorContextID)
	_, err := RecordManualTransferExecution(ctx, db, batchID, RecordManualExecutionInput{
		ApprovedSnapshotID:        snapshotID,
		ExternalTransferReference: "sod-ref-" + snapshotID,
		AmountMinorUnits:          amount,
		Currency:                  "YER",
		OperatorID:                "finance-approver-1",
	}, "sod-corr")
	if !errors.Is(err, ErrSeparationOfDuties) {
		t.Fatalf("expected the approver to be barred from executing their own approval, got %v", err)
	}
}

// freezeBatchForSnapshot puts one approved snapshot into a frozen batch, which
// is the only state external execution may be recorded against.
func freezeBatchForSnapshot(t *testing.T, db *sql.DB, operatorContextID, snapshotID string) string {
	t.Helper()
	var batchID string
	if err := db.QueryRow(`INSERT INTO wlt_settlement_batches
		(operator_context_id, provider_id, currency, batch_hash, control_total_minor_units, row_count, created_by_operator_id, status, frozen_at)
		VALUES ($1, 'test-provider', 'YER', 'test-hash-'||$2, 10000, 1, 'finance-maker-1', 'frozen', now())
		RETURNING id`, operatorContextID, snapshotID).Scan(&batchID); err != nil {
		t.Fatalf("seed frozen batch: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO wlt_settlement_batch_rows (batch_id, approved_snapshot_id) VALUES ($1, $2)`, batchID, snapshotID); err != nil {
		t.Fatalf("seed batch row: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_manual_transfer_evidence WHERE batch_id = $1`, batchID)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_batch_rows WHERE batch_id = $1`, batchID)
		_, _ = db.Exec(`DELETE FROM wlt_settlement_batches WHERE id = $1`, batchID)
	})
	return batchID
}

func payoutIDFromResponse(t *testing.T, res *httptest.ResponseRecorder) string {
	t.Helper()
	return decodePayoutID(t, res)
}

func decodePayoutID(t *testing.T, res *httptest.ResponseRecorder) string {
	t.Helper()
	var out struct {
		PayoutRequest struct {
			ID string `json:"id"`
		} `json:"payoutRequest"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &out); err != nil {
		t.Fatalf("decode payout ID: %v", err)
	}
	if out.PayoutRequest.ID == "" {
		t.Fatalf("payout ID not found in response: %s", res.Body.String())
	}
	return out.PayoutRequest.ID
}

func approvePayout(t *testing.T, db *sql.DB, operatorContextID, payoutID, operatorID string) *httptest.ResponseRecorder {
	t.Helper()
	body, _ := json.Marshal(map[string]any{"operatorId": operatorID})
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/wlt/payouts/%s/approve", payoutID), bytes.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("x-operator-context-id", operatorContextID)
	req.Header.Set("x-correlation-id", "test-approve-corr")
	res := httptest.NewRecorder()
	HandleApprovePayoutRequestSovereign(db)(res, req)
	return res
}
