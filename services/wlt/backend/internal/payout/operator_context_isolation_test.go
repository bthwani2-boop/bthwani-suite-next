package payout

// These tests exercise per-row operator_context_id scoping guards inside one
// WLT deployment. Beneficiary payout intent never carries a destination id;
// the current verified destination is resolved inside the trusted context.

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"wlt-api/internal/ledger"
	"wlt-api/internal/shared"
)

const testOfficialWalletProviderKey = "test_official_wallet"
const testDestinationMaker = "finance-destination-maker-test"

func seedOfficialWalletProvider(t *testing.T, db *sql.DB, operatorContextID string) {
	t.Helper()
	if _, err := db.Exec(`INSERT INTO wlt_official_wallet_providers
		(operator_context_id, provider_key, display_name, active)
		VALUES ($1,$2,'Test Official Wallet',true)
		ON CONFLICT (operator_context_id, provider_key) DO UPDATE SET active=true`,
		operatorContextID, testOfficialWalletProviderKey); err != nil {
		t.Fatalf("seed official wallet provider for %s: %v", operatorContextID, err)
	}
}

func canonicalizePayoutTestWallet(t *testing.T, db *sql.DB, operatorContextID, actorID string) {
	t.Helper()
	var settled int64
	var currency string
	err := db.QueryRow(`SELECT settled_total_minor_units,currency
		FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&settled, &currency)
	if errors.Is(err, sql.ErrNoRows) {
		return
	}
	if err != nil {
		t.Fatalf("read payout test wallet fixture: %v", err)
	}
	if settled <= 0 {
		return
	}
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	projection, err := ledger.GetWalletLedgerProjection(ctx, db, "field", actorID, currency)
	if err != nil {
		t.Fatalf("read canonical payout test wallet projection: %v", err)
	}
	if projection != nil {
		return
	}
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin canonical payout test wallet seed: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := ledger.PostOpeningBalance(ctx, tx, "field", actorID, currency, settled,
		"payout-test-opening:"+actorID, ledger.Actor{ID: "payout-test", Type: "test"}); err != nil {
		t.Fatalf("post canonical payout test opening balance: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit canonical payout test opening balance: %v", err)
	}
}

func seedPayoutTestSettledWallet(t *testing.T, db *sql.DB, operatorContextID, actorID string, amount int64) {
	t.Helper()
	if amount <= 0 {
		t.Fatalf("payout test wallet amount must be positive, got %d", amount)
	}
	ctx := shared.WithOperatorContext(context.Background(), operatorContextID)
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatalf("begin payout test settled wallet seed: %v", err)
	}
	defer tx.Rollback() //nolint:errcheck
	if _, err := ledger.PostOpeningBalance(ctx, tx, "field", actorID, "YER", amount,
		"payout-test-opening:"+actorID, ledger.Actor{ID: "payout-test", Type: "test"}); err != nil {
		t.Fatalf("post payout test opening balance: %v", err)
	}
	if _, err := tx.ExecContext(ctx, `INSERT INTO wlt_commissions
		(operator_context_id,beneficiary_actor_id,beneficiary_actor_type,source_type,source_id,
		 commission_type,amount_minor_units,currency,status,settled_at,idempotency_key,created_by)
		SELECT $1,$2,'field','payout_test_settlement',$3,
		 'field_visit_fee',$4,'YER','settled',now(),$5,'payout-test'
		WHERE NOT EXISTS (
			SELECT 1 FROM wlt_commissions
			WHERE operator_context_id=$1 AND idempotency_key=$5
		)`,
		operatorContextID, actorID, "payout-test-settled:"+actorID, amount, "payout-test-settled:"+actorID); err != nil {
		t.Fatalf("seed payout test settled commission: %v", err)
	}
	if err := tx.Commit(); err != nil {
		t.Fatalf("commit payout test settled wallet seed: %v", err)
	}
}

func upsertOfficialWalletDestination(t *testing.T, db *sql.DB, operatorContextID, actorID, reference, idempotencyKey, correlationID string) (governedDestinationRef, int) {
	t.Helper()
	body := fmt.Sprintf(`{
		"beneficiaryName":"OperatorContext Payout Test",
		"officialWalletProviderKey":%q,
		"destinationReference":%q,
		"reason":"test finance destination provisioning",
		"evidenceReference":"test-evidence:%s"
	}`, testOfficialWalletProviderKey, reference, idempotencyKey)
	req := httptest.NewRequest(http.MethodPut, "/wlt/payout-destinations/field/"+actorID, strings.NewReader(body))
	ctx := shared.WithOperatorContext(req.Context(), operatorContextID)
	req = req.WithContext(shared.WithDelegatedFinancePrincipal(ctx, testDestinationMaker))
	req.SetPathValue("actorType", "field")
	req.SetPathValue("actorId", actorID)
	req.Header.Set("X-Correlation-ID", correlationID)
	req.Header.Set("Idempotency-Key", idempotencyKey)
	res := httptest.NewRecorder()
	HandleUpsertCanonicalPayoutDestination(db)(res, req)
	var response struct {
		PayoutDestination governedDestinationRef `json:"payoutDestination"`
	}
	if res.Code == http.StatusCreated || res.Code == http.StatusOK {
		if err := json.Unmarshal(res.Body.Bytes(), &response); err != nil {
			t.Fatalf("decode destination response: %v", err)
		}
	}
	return response.PayoutDestination, res.Code
}

func verifyOfficialWalletDestination(t *testing.T, db *sql.DB, operatorContextID, actorID string, version int, decision, operatorID string) int {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"destinationVersion": version,
		"decision":           decision,
		"reason":             "test independent verification",
		"evidenceReference":  "verification-evidence:" + actorID,
	})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-destinations/field/"+actorID+"/verify", bytes.NewReader(body))
	ctx := shared.WithOperatorContext(req.Context(), operatorContextID)
	req = req.WithContext(shared.WithDelegatedFinancePrincipal(ctx, operatorID))
	req.SetPathValue("actorType", "field")
	req.SetPathValue("actorId", actorID)
	req.Header.Set("X-Correlation-ID", "verify-"+operatorContextID)
	res := httptest.NewRecorder()
	HandleVerifyCanonicalPayoutDestination(db)(res, req)
	return res.Code
}

func executeDestinationUpsert(t *testing.T, db *sql.DB, operatorContextID, actorID, correlationID string) governedDestinationRef {
	t.Helper()
	canonicalizePayoutTestWallet(t, db, operatorContextID, actorID)
	seedOfficialWalletProvider(t, db, operatorContextID)
	destination, code := upsertOfficialWalletDestination(t, db, operatorContextID, actorID, "1234567890", "dest-"+correlationID, correlationID)
	if code != http.StatusCreated {
		t.Fatalf("destination upsert for %s returned %d", operatorContextID, code)
	}
	if destination.ID == "" {
		t.Fatal("destination id is required")
	}
	if destination.DestinationVerificationStatus != verificationUnverified {
		t.Fatalf("a new destination version must start unverified, got %q", destination.DestinationVerificationStatus)
	}
	if code := verifyOfficialWalletDestination(t, db, operatorContextID, actorID, destination.DestinationVersion, verificationVerified, "finance-operator-test"); code != http.StatusOK {
		t.Fatalf("destination verification for %s returned %d", operatorContextID, code)
	}
	destination.DestinationVerificationStatus = verificationVerified
	return destination
}

func executePayoutCreate(t *testing.T, db *sql.DB, operatorContextID, actorID, idempotencyKey string, amount int64) *httptest.ResponseRecorder {
	t.Helper()
	canonicalizePayoutTestWallet(t, db, operatorContextID, actorID)
	body, err := json.Marshal(map[string]any{
		"beneficiaryActorId":   actorID,
		"beneficiaryActorType": "field",
		"amountMode":           payoutAmountModeSpecified,
		"amountMinorUnits":     amount,
		"currency":             "YER",
		"idempotencyKey":       idempotencyKey,
	})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", bytes.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.Header.Set("X-Correlation-ID", "payout-create-"+operatorContextID)
	res := httptest.NewRecorder()
	HandleCreateGovernedPayoutRequest(db)(res, req)
	return res
}

func executeFullAvailablePayoutCreate(t *testing.T, db *sql.DB, operatorContextID, actorID, idempotencyKey string) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"beneficiaryActorId":   actorID,
		"beneficiaryActorType": "field",
		"amountMode":           payoutAmountModeFullAvailable,
		"currency":             "YER",
		"idempotencyKey":       idempotencyKey,
	})
	if err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", bytes.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.Header.Set("X-Correlation-ID", "payout-full-create-"+operatorContextID)
	res := httptest.NewRecorder()
	HandleCreateGovernedPayoutRequest(db)(res, req)
	return res
}

func TestPayoutCreationFailsClosedWithoutOperatorContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(`{}`))
	res := httptest.NewRecorder()
	HandleCreateGovernedPayoutRequest(nil)(res, req)
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "OperatorContext_REQUIRED") {
		t.Fatalf("expected OperatorContext-required rejection, got %d: %s", res.Code, res.Body.String())
	}
}

func TestPayoutDestinationsRequestsAndReservationsAreOperatorContextLocal(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "OperatorContext-payout-test-key-32-bytes")

	suffix := fmt.Sprint(time.Now().UnixNano())
	operatorContexts := []string{"OperatorContext-payout-a-" + suffix, "OperatorContext-payout-b-" + suffix}
	actorID := "field-payout-shared-" + suffix
	idempotencyKey := "payout-shared-" + suffix
	const initialBalance int64 = 100000
	const amount int64 = 25000

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_payout_reconciliations WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_audit_events WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_approved_payout_snapshots WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_requests WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_official_wallet_providers WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(operatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_wallets WHERE operator_context_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`, pqPayoutTextArray(operatorContexts), actorID)
	})

	destinations := make(map[string]governedDestinationRef, len(operatorContexts))
	for _, operatorContextID := range operatorContexts {
		seedPayoutTestSettledWallet(t, db, operatorContextID, actorID, initialBalance)
		destinations[operatorContextID] = executeDestinationUpsert(t, db, operatorContextID, actorID, "destination-"+operatorContextID)
		res := executePayoutCreate(t, db, operatorContextID, actorID, idempotencyKey, amount)
		if res.Code != http.StatusCreated {
			t.Fatalf("payout create for %s returned %d: %s", operatorContextID, res.Code, res.Body.String())
		}
	}

	for _, operatorContextID := range operatorContexts {
		var available, pending int64
		if err := db.QueryRow(`SELECT available_balance_minor_units,pending_balance_minor_units
			FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &pending); err != nil {
			t.Fatal(err)
		}
		if available != initialBalance-amount || pending != amount {
			t.Fatalf("OperatorContext %s wallet available=%d pending=%d", operatorContextID, available, pending)
		}
	}
	var requestCount int
	if err := db.QueryRow(`SELECT count(*) FROM wlt_payout_requests
		WHERE operator_context_id = ANY($1::text[]) AND idempotency_key=$2`, pqPayoutTextArray(operatorContexts), idempotencyKey).Scan(&requestCount); err != nil {
		t.Fatal(err)
	}
	if requestCount != 2 {
		t.Fatalf("expected two OperatorContext-local payout requests, got %d", requestCount)
	}

	// A second request in context A cannot choose or inject context B's
	// destination. WLT must resolve A's current verified destination itself.
	second := executePayoutCreate(t, db, operatorContexts[0], actorID, "second-local-"+suffix, 1000)
	if second.Code != http.StatusCreated {
		t.Fatalf("second local payout returned %d: %s", second.Code, second.Body.String())
	}
	secondID := decodePayoutID(t, second)
	var boundDestination string
	if err := db.QueryRow(`SELECT payout_destination_id FROM wlt_payout_requests WHERE operator_context_id=$1 AND id=$2`, operatorContexts[0], secondID).Scan(&boundDestination); err != nil {
		t.Fatal(err)
	}
	if boundDestination != destinations[operatorContexts[0]].ID || boundDestination == destinations[operatorContexts[1]].ID {
		t.Fatalf("WLT bound payout to wrong OperatorContext destination: got=%s", boundDestination)
	}
}

func pqPayoutTextArray(values []string) string {
	out := "{"
	for i, value := range values {
		if i > 0 {
			out += ","
		}
		out += `"` + strings.ReplaceAll(value, `"`, `\"`) + `"`
	}
	return out + "}"
}
