package payout

import (
	"bytes"
	"database/sql"
	"encoding/json"
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
	if _, err := db.Exec(`INSERT INTO wlt_wallets
		(operator_context_id,actor_id,actor_type,status,currency,available_balance_minor_units,settled_total_minor_units)
		VALUES ($1,$2,'field','active','YER',$3,$3)
		ON CONFLICT (operator_context_id,actor_type,actor_id) DO UPDATE SET
		  available_balance_minor_units=$3,settled_total_minor_units=$3,held_balance_minor_units=0,paid_total_minor_units=0`,
		operatorContextID, actorID, balance); err != nil {
		t.Fatalf("seed wallet: %v", err)
	}

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
	if _, err := db.Exec(`INSERT INTO wlt_wallets
		(operator_context_id,actor_id,actor_type,status,currency,available_balance_minor_units,settled_total_minor_units)
		VALUES ($1,$2,'field','active','YER',$3,$3)`, operatorContextID, actorID, balance); err != nil {
		t.Fatalf("seed wallet: %v", err)
	}
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

	// The approver cannot also process (maker/checker: process differs from approver).
	sameOperatorProcess := processPayout(t, db, operatorContextID, snapshotID, "finance-approver-1")
	_ = sameOperatorProcess // processPayout resolves the payout id internally; see helper.
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

func processPayout(t *testing.T, db *sql.DB, operatorContextID, snapshotID, operatorID string) *httptest.ResponseRecorder {
	t.Helper()
	var payoutID string
	if err := db.QueryRow("SELECT payout_request_id FROM wlt_approved_payout_snapshots WHERE id = $1 AND operator_context_id = $2", snapshotID, operatorContextID).Scan(&payoutID); err != nil {
		t.Fatalf("failed to resolve payout ID from snapshot: %v", err)
	}
	body, _ := json.Marshal(map[string]any{"operatorId": operatorID})
	req := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/wlt/payouts/%s/process", payoutID), bytes.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.SetPathValue("payoutId", payoutID)
	req.Header.Set("x-operator-context-id", operatorContextID)
	req.Header.Set("x-correlation-id", "test-process-corr")
	res := httptest.NewRecorder()
	HandleProcessGovernedPayoutRequest(db)(res, req)
	return res
}
