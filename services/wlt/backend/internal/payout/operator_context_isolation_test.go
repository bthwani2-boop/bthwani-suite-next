package payout

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"wlt-api/internal/shared"
)

func executeDestinationUpsert(t *testing.T, db *sql.DB, operatorContextID, actorID, correlationID string) governedDestinationRef {
	t.Helper()
	body := fmt.Sprintf(`{
		"beneficiaryName":"OperatorContext Payout Test",
		"bankName":"Test Bank",
		"accountNumber":"1234567890",
		"settlementPreference":"bank",
		"bankAccountHolderMatchesOwner":true,
		"operatorId":"operator-test"
	}`)
	req := httptest.NewRequest(http.MethodPut, "/wlt/payout-destinations/field/"+actorID, strings.NewReader(body))
	req = req.WithContext(shared.WithOperatorContext(req.Context(), operatorContextID))
	req.SetPathValue("actorType", "field")
	req.SetPathValue("actorId", actorID)
	req.Header.Set("X-Correlation-ID", correlationID)
	res := httptest.NewRecorder()
	HandleUpsertTypedPayoutDestination(db)(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("destination upsert for %s returned %d: %s", operatorContextID, res.Code, res.Body.String())
	}
	var response struct {
		PayoutDestination governedDestinationRef `json:"payoutDestination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode destination response: %v", err)
	}
	if response.PayoutDestination.ID == "" {
		t.Fatal("destination id is required")
	}
	return response.PayoutDestination
}

func executePayoutCreate(t *testing.T, db *sql.DB, operatorContextID, actorID, destinationID, idempotencyKey string, amount int64) *httptest.ResponseRecorder {
	t.Helper()
	body, err := json.Marshal(map[string]any{
		"beneficiaryActorId": actorID,
		"beneficiaryActorType": "field",
		"payoutDestinationId": destinationID,
		"amountMinorUnits": amount,
		"currency": "YER",
		"idempotencyKey": idempotencyKey,
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

func TestPayoutCreationFailsClosedWithoutOperatorContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(`{}`))
	res := httptest.NewRecorder()
	HandleCreateGovernedPayoutRequest(nil)(res, req)
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "OperatorContext_REQUIRED") {
		t.Fatalf("expected OperatorContext-required rejection, got %d: %s", res.Code, res.Body.String())
	}
}

func TestPayoutDestinationsRequestsAndWalletHoldsAreOperatorContextLocal(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "OperatorContext-payout-test-key-32-bytes")

	suffix := fmt.Sprint(time.Now().UnixNano())
	OperatorContexts := []string{"OperatorContext-payout-a-" + suffix, "OperatorContext-payout-b-" + suffix}
	actorID := "field-payout-shared-" + suffix
	idempotencyKey := "payout-shared-" + suffix
	const initialBalance int64 = 100000
	const amount int64 = 25000

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_outbox WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_reconciliations WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_audit_events WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_requests WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE operator_context_id = ANY($1::text[])`, pqPayoutTextArray(OperatorContexts))
		_, _ = db.Exec(`DELETE FROM wlt_wallets WHERE operator_context_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`, pqPayoutTextArray(OperatorContexts), actorID)
	})

	destinations := make(map[string]governedDestinationRef, len(OperatorContexts))
	for _, operatorContextID := range OperatorContexts {
		if _, err := db.Exec(`INSERT INTO wlt_wallets
			(operator_context_id,actor_id,actor_type,status,currency,available_balance_minor_units)
			VALUES ($1,$2,'field','active','YER',$3)
			ON CONFLICT (operator_context_id,actor_type,actor_id) DO UPDATE SET
			  status='active',currency='YER',available_balance_minor_units=$3,
			  held_balance_minor_units=0,updated_at=now()`, operatorContextID, actorID, initialBalance); err != nil {
			t.Fatalf("seed %s wallet: %v", operatorContextID, err)
		}
		destinations[operatorContextID] = executeDestinationUpsert(t, db, operatorContextID, actorID, "destination-"+operatorContextID)
		res := executePayoutCreate(t, db, operatorContextID, actorID, destinations[operatorContextID].ID, idempotencyKey, amount)
		if res.Code != http.StatusCreated {
			t.Fatalf("payout create for %s returned %d: %s", operatorContextID, res.Code, res.Body.String())
		}
	}

	for _, operatorContextID := range OperatorContexts {
		var available, held int64
		if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units
			FROM wlt_wallets WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, operatorContextID, actorID).Scan(&available, &held); err != nil {
			t.Fatal(err)
		}
		if available != initialBalance-amount || held != amount {
			t.Fatalf("OperatorContext %s wallet available=%d held=%d", operatorContextID, available, held)
		}
	}
	var requestCount int
	if err := db.QueryRow(`SELECT count(*) FROM wlt_payout_requests
		WHERE operator_context_id = ANY($1::text[]) AND idempotency_key=$2`, pqPayoutTextArray(OperatorContexts), idempotencyKey).Scan(&requestCount); err != nil {
		t.Fatal(err)
	}
	if requestCount != 2 {
		t.Fatalf("expected two OperatorContext-local payout requests, got %d", requestCount)
	}

	beforeAvailable := int64(0)
	beforeHeld := int64(0)
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, OperatorContexts[0], actorID).Scan(&beforeAvailable, &beforeHeld); err != nil {
		t.Fatal(err)
	}
	crossOperatorContext := executePayoutCreate(t, db, OperatorContexts[0], actorID, destinations[OperatorContexts[1]].ID, "cross-OperatorContext-"+suffix, 1000)
	if crossOperatorContext.Code != http.StatusForbidden {
		t.Fatalf("expected cross-OperatorContext destination rejection, got %d: %s", crossOperatorContext.Code, crossOperatorContext.Body.String())
	}
	var afterAvailable, afterHeld int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE operator_context_id=$1 AND actor_type='field' AND actor_id=$2`, OperatorContexts[0], actorID).Scan(&afterAvailable, &afterHeld); err != nil {
		t.Fatal(err)
	}
	if beforeAvailable != afterAvailable || beforeHeld != afterHeld {
		t.Fatalf("cross-OperatorContext rejection mutated OperatorContext A wallet: before %d/%d after %d/%d", beforeAvailable, beforeHeld, afterAvailable, afterHeld)
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

var _ = context.Background
