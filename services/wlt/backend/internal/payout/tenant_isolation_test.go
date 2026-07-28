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

func executeDestinationUpsert(t *testing.T, db *sql.DB, tenantID, actorID, correlationID string) governedDestinationRef {
	t.Helper()
	body := fmt.Sprintf(`{
		"beneficiaryName":"Tenant Payout Test",
		"bankName":"Test Bank",
		"accountNumber":"1234567890",
		"settlementPreference":"bank",
		"bankAccountHolderMatchesOwner":true,
		"operatorId":"operator-test"
	}`)
	req := httptest.NewRequest(http.MethodPut, "/wlt/payout-destinations/field/"+actorID, strings.NewReader(body))
	req = req.WithContext(shared.WithTenantContext(req.Context(), tenantID))
	req.SetPathValue("actorType", "field")
	req.SetPathValue("actorId", actorID)
	req.Header.Set("X-Correlation-ID", correlationID)
	res := httptest.NewRecorder()
	HandleUpsertPayoutDestinationJRN037(db)(res, req)
	if res.Code != http.StatusCreated {
		t.Fatalf("destination upsert for %s returned %d: %s", tenantID, res.Code, res.Body.String())
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

func executePayoutCreate(t *testing.T, db *sql.DB, tenantID, actorID, destinationID, idempotencyKey string, amount int64) *httptest.ResponseRecorder {
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
	req = req.WithContext(shared.WithTenantContext(req.Context(), tenantID))
	req.Header.Set("X-Correlation-ID", "payout-create-"+tenantID)
	res := httptest.NewRecorder()
	HandleCreatePayoutRequestJRN037(db)(res, req)
	return res
}

func TestPayoutCreationFailsClosedWithoutTenant(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	req := httptest.NewRequest(http.MethodPost, "/wlt/payout-requests", strings.NewReader(`{}`))
	res := httptest.NewRecorder()
	HandleCreatePayoutRequestJRN037(nil)(res, req)
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "TENANT_REQUIRED") {
		t.Fatalf("expected tenant-required rejection, got %d: %s", res.Code, res.Body.String())
	}
}

func TestPayoutDestinationsRequestsAndWalletHoldsAreTenantLocal(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("BTHWANI_SAAS_MODE", "active")
	t.Setenv("WLT_PAYOUT_ENCRYPTION_KEY", "tenant-payout-test-key-32-bytes")

	suffix := fmt.Sprint(time.Now().UnixNano())
	tenants := []string{"tenant-payout-a-" + suffix, "tenant-payout-b-" + suffix}
	actorID := "field-payout-shared-" + suffix
	idempotencyKey := "payout-shared-" + suffix
	const initialBalance int64 = 100000
	const amount int64 = 25000

	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_outbox WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_reconciliations WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_jrn037_payout_audit_events WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_payout_requests WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destination_requests WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_payout_destinations WHERE tenant_id = ANY($1::text[])`, pqPayoutTextArray(tenants))
		_, _ = db.Exec(`DELETE FROM wlt_wallets WHERE tenant_id = ANY($1::text[]) AND actor_type='field' AND actor_id=$2`, pqPayoutTextArray(tenants), actorID)
	})

	destinations := make(map[string]governedDestinationRef, len(tenants))
	for _, tenantID := range tenants {
		if _, err := db.Exec(`INSERT INTO wlt_wallets
			(tenant_id,actor_id,actor_type,status,currency,available_balance_minor_units)
			VALUES ($1,$2,'field','active','YER',$3)
			ON CONFLICT (tenant_id,actor_type,actor_id) DO UPDATE SET
			  status='active',currency='YER',available_balance_minor_units=$3,
			  held_balance_minor_units=0,updated_at=now()`, tenantID, actorID, initialBalance); err != nil {
			t.Fatalf("seed %s wallet: %v", tenantID, err)
		}
		destinations[tenantID] = executeDestinationUpsert(t, db, tenantID, actorID, "destination-"+tenantID)
		res := executePayoutCreate(t, db, tenantID, actorID, destinations[tenantID].ID, idempotencyKey, amount)
		if res.Code != http.StatusCreated {
			t.Fatalf("payout create for %s returned %d: %s", tenantID, res.Code, res.Body.String())
		}
	}

	for _, tenantID := range tenants {
		var available, held int64
		if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units
			FROM wlt_wallets WHERE tenant_id=$1 AND actor_type='field' AND actor_id=$2`, tenantID, actorID).Scan(&available, &held); err != nil {
			t.Fatal(err)
		}
		if available != initialBalance-amount || held != amount {
			t.Fatalf("tenant %s wallet available=%d held=%d", tenantID, available, held)
		}
	}
	var requestCount int
	if err := db.QueryRow(`SELECT count(*) FROM wlt_payout_requests
		WHERE tenant_id = ANY($1::text[]) AND idempotency_key=$2`, pqPayoutTextArray(tenants), idempotencyKey).Scan(&requestCount); err != nil {
		t.Fatal(err)
	}
	if requestCount != 2 {
		t.Fatalf("expected two tenant-local payout requests, got %d", requestCount)
	}

	beforeAvailable := int64(0)
	beforeHeld := int64(0)
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE tenant_id=$1 AND actor_type='field' AND actor_id=$2`, tenants[0], actorID).Scan(&beforeAvailable, &beforeHeld); err != nil {
		t.Fatal(err)
	}
	crossTenant := executePayoutCreate(t, db, tenants[0], actorID, destinations[tenants[1]].ID, "cross-tenant-"+suffix, 1000)
	if crossTenant.Code != http.StatusForbidden {
		t.Fatalf("expected cross-tenant destination rejection, got %d: %s", crossTenant.Code, crossTenant.Body.String())
	}
	var afterAvailable, afterHeld int64
	if err := db.QueryRow(`SELECT available_balance_minor_units,held_balance_minor_units FROM wlt_wallets
		WHERE tenant_id=$1 AND actor_type='field' AND actor_id=$2`, tenants[0], actorID).Scan(&afterAvailable, &afterHeld); err != nil {
		t.Fatal(err)
	}
	if beforeAvailable != afterAvailable || beforeHeld != afterHeld {
		t.Fatalf("cross-tenant rejection mutated tenant A wallet: before %d/%d after %d/%d", beforeAvailable, beforeHeld, afterAvailable, afterHeld)
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
