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

// TestConcurrentPayoutRequestsCannotOverReserveWallet proves two requests
// racing against one wallet cannot reserve more than the eligible balance.
func TestConcurrentPayoutRequestsCannotOverReserveWallet(t *testing.T) {
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
	executeDestinationUpsert(t, db, operatorContextID, actorID, "concurrency-corr")

	const askPerRequest int64 = 70000
	results := make([]int, 2)
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			res := executePayoutCreate(t, db, operatorContextID, actorID,
				fmt.Sprintf("concurrent-reserve-%s-%d", operatorContextID, i), askPerRequest)
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

	var available, pending int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &pending); err != nil {
		t.Fatal(err)
	}
	if pending > balance || available < 0 {
		t.Fatalf("wallet over-reserved: available=%d pending=%d balance=%d", available, pending, balance)
	}
	if pending != askPerRequest {
		t.Fatalf("expected exactly one reservation of %d, got pending=%d", askPerRequest, pending)
	}
}

func TestFullAvailablePayoutIsResolvedInsideLockedWallet(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "concurrency-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	const balance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)
	executeDestinationUpsert(t, db, operatorContextID, actorID, "full-available-corr")

	first := executePayoutCreate(t, db, operatorContextID, actorID, "first-reservation-"+operatorContextID, 25000)
	if first.Code != http.StatusCreated {
		t.Fatalf("first reservation returned %d: %s", first.Code, first.Body.String())
	}
	full := executeFullAvailablePayoutCreate(t, db, operatorContextID, actorID, "full-available-"+operatorContextID)
	if full.Code != http.StatusCreated {
		t.Fatalf("FULL_AVAILABLE returned %d: %s", full.Code, full.Body.String())
	}
	var envelope struct {
		PayoutRequest struct {
			AmountMinorUnits int64 `json:"amountMinorUnits"`
		} `json:"payoutRequest"`
	}
	if err := json.Unmarshal(full.Body.Bytes(), &envelope); err != nil {
		t.Fatal(err)
	}
	if envelope.PayoutRequest.AmountMinorUnits != balance-25000 {
		t.Fatalf("FULL_AVAILABLE amount=%d, want %d", envelope.PayoutRequest.AmountMinorUnits, balance-25000)
	}
}

func TestApprovedPayoutSnapshotIsImmutable(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "concurrency-test-key-32-bytes-long")

	operatorContextID, actorID, _ := destinationTestContext(t)
	t.Cleanup(func() { cleanupDestinationContext(t, operatorContextID, actorID) })
	const balance int64 = 100000
	seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, balance)
	executeDestinationUpsert(t, db, operatorContextID, actorID, "immutable-corr")
	res := executePayoutCreate(t, db, operatorContextID, actorID, "immutable-payout-"+operatorContextID, 10000)
	if res.Code != http.StatusCreated {
		t.Fatalf("payout create returned %d: %s", res.Code, res.Body.String())
	}

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

	batchID := freezeBatchForSnapshot(t, db, operatorContextID, snapshotID)
	ctx := shared.WithDelegatedFinancePrincipal(shared.WithOperatorContext(t.Context(), operatorContextID), "finance-approver-1")
	_, err := RecordManualTransferExecution(ctx, db, batchID, RecordManualExecutionInput{
		ApprovedSnapshotID:        snapshotID,
		ExternalTransferReference: "sod-ref-" + snapshotID,
		EvidenceReference:         "proof:sod-" + snapshotID,
	}, "sod-corr")
	if !errors.Is(err, ErrSeparationOfDuties) {
		t.Fatalf("expected the approver to be barred from executing their own approval, got %v", err)
	}
}

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
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/wlt/payouts/%s/approve", payoutID), bytes.NewReader([]byte(`{}`)))
	ctx := shared.WithOperatorContext(req.Context(), operatorContextID)
	req = req.WithContext(shared.WithDelegatedFinancePrincipal(ctx, operatorID))
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("X-Delegated-Operator-Context", operatorContextID)
	req.Header.Set("x-correlation-id", "test-approve-corr")
	res := httptest.NewRecorder()
	HandleApprovePayoutRequestSovereign(db)(res, req)
	return res
}
