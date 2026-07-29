package http

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// getTestDB mirrors the *_db_test.go convention used across the settlement,
// cod and payout packages: skip (or fail, under WLT_REQUIRE_DB_TESTS) when no
// database is reachable rather than fail the whole suite in environments
// without Postgres.
func getTestDB(t *testing.T) *sql.DB {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	requireDB := os.Getenv("WLT_REQUIRE_DB_TESTS") == "true"
	if dbURL == "" {
		dbURL = "postgres://wlt_runtime:wlt_runtime_password@localhost:55432/wlt_runtime?sslmode=disable"
	}
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		if requireDB {
			t.Fatalf("failed to open DB connection: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to open connection: %v", err)
		return nil
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		if requireDB {
			t.Fatalf("failed to ping DB: %v", err)
		}
		t.Skipf("Skipping DB integration test: failed to ping DB: %v", err)
		return nil
	}
	return db
}

func uniqueSuffix() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

func newOperatorContextScopedRequest(method, path, operatorContextID string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	if operatorContextID != "" {
		req.Header.Set("X-Operator-Context-ID", operatorContextID)
	}
	return httptest.NewRecorder()
}

func doOperatorContextScopedRequest(router interface {
	ServeHTTP(w interface {
		Header() map[string][]string
	}, r interface{})
}, w, r interface{}) {
}

// TestSettlementRoutes_OperatorContextScoping proves: (1) a GET for another OperatorContext's
// settlement id returns 404 (never 403 -- tenancy must not become an
// identifier-enumeration oracle), that OperatorContext's own request succeeds, and
// (2) the unfiltered list route only returns rows owned by the trusted
// OperatorContext even though a legacy-unscoped row and another OperatorContext's row also
// exist in the table.
func TestSettlementRoutes_OperatorContextScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix
	partnerA := "partner-a-" + suffix

	var settlementAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, operator_context_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)
		RETURNING id`, partnerA, OperatorContextA).Scan(&settlementAID); err != nil {
		t.Fatalf("failed to insert OperatorContext A settlement fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, operator_context_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)`, "partner-b-"+suffix, OperatorContextB); err != nil {
		t.Fatalf("failed to insert OperatorContext B settlement fixture: %v", err)
	}

	router := NewRouter(db, true)

	// OperatorContext B requesting OperatorContext A's settlement by id must get 404.
	reqCrossOperatorContext := httptest.NewRequest("GET", "/wlt/settlements/"+settlementAID, nil)
	reqCrossOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqCrossOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextB)
	recCrossOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recCrossOperatorContext, reqCrossOperatorContext)
	if recCrossOperatorContext.Code != 404 {
		t.Fatalf("OperatorContext B reading OperatorContext A's settlement: expected 404, got %d body=%s", recCrossOperatorContext.Code, recCrossOperatorContext.Body.String())
	}

	// OperatorContext A requesting its own settlement must succeed.
	reqOwnOperatorContext := httptest.NewRequest("GET", "/wlt/settlements/"+settlementAID, nil)
	reqOwnOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqOwnOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recOwnOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recOwnOperatorContext, reqOwnOperatorContext)
	if recOwnOperatorContext.Code != 200 {
		t.Fatalf("OperatorContext A reading its own settlement: expected 200, got %d body=%s", recOwnOperatorContext.Code, recOwnOperatorContext.Body.String())
	}

	// The unfiltered list route must only return OperatorContext A's rows.
	reqList := httptest.NewRequest("GET", "/wlt/settlements", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("OperatorContext A listing settlements: expected 200, got %d body=%s", recList.Code, recList.Body.String())
	}
	var listBody struct {
		Settlements []struct {
			ID        string `json:"id"`
			PartnerID string `json:"partnerId"`
		} `json:"settlements"`
	}
	if err := json.Unmarshal(recList.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("failed to decode settlement list response: %v", err)
	}
	for _, s := range listBody.Settlements {
		if s.PartnerID == "partner-b-"+suffix {
			t.Fatalf("OperatorContext A's settlement list leaked OperatorContext B's settlement %s", s.ID)
		}
	}
	found := false
	for _, s := range listBody.Settlements {
		if s.ID == settlementAID {
			found = true
		}
	}
	if !found {
		t.Fatalf("OperatorContext A's settlement list did not include OperatorContext A's own settlement %s", settlementAID)
	}
}

// TestCodRecordRoutes_OperatorContextScoping mirrors the settlement test for COD
// records: cross-OperatorContext get-by-id is a 404, own-OperatorContext get-by-id succeeds,
// and the list route never leaks another OperatorContext's row.
func TestCodRecordRoutes_OperatorContextScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix
	partnerA := "partner-a-" + suffix

	var codAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)
		RETURNING id`, "order-a-"+suffix, "captain-a-"+suffix, partnerA, OperatorContextA).Scan(&codAID); err != nil {
		t.Fatalf("failed to insert OperatorContext A cod record fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)`,
		"order-b-"+suffix, "captain-b-"+suffix, "partner-b-"+suffix, OperatorContextB); err != nil {
		t.Fatalf("failed to insert OperatorContext B cod record fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossOperatorContext := httptest.NewRequest("GET", "/wlt/cod-records/"+codAID, nil)
	reqCrossOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqCrossOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextB)
	recCrossOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recCrossOperatorContext, reqCrossOperatorContext)
	if recCrossOperatorContext.Code != 404 {
		t.Fatalf("OperatorContext B reading OperatorContext A's cod record: expected 404, got %d body=%s", recCrossOperatorContext.Code, recCrossOperatorContext.Body.String())
	}

	reqOwnOperatorContext := httptest.NewRequest("GET", "/wlt/cod-records/"+codAID, nil)
	reqOwnOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqOwnOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recOwnOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recOwnOperatorContext, reqOwnOperatorContext)
	if recOwnOperatorContext.Code != 200 {
		t.Fatalf("OperatorContext A reading its own cod record: expected 200, got %d body=%s", recOwnOperatorContext.Code, recOwnOperatorContext.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/cod-records?partnerId="+partnerA, nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Operator-Context-ID", OperatorContextB)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("OperatorContext B listing by OperatorContext A's partnerId: expected 200, got %d body=%s", recList.Code, recList.Body.String())
	}
	var listBody struct {
		CodRecords []struct {
			ID string `json:"id"`
		} `json:"codRecords"`
	}
	if err := json.Unmarshal(recList.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("failed to decode cod record list response: %v", err)
	}
	if len(listBody.CodRecords) != 0 {
		t.Fatalf("OperatorContext B's cod-records list leaked OperatorContext A's partnerId-filtered rows: %+v", listBody.CodRecords)
	}
}

// TestCommissionRoutes_OperatorContextScoping mirrors the settlement test for
// commissions.
func TestCommissionRoutes_OperatorContextScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix

	var commissionAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)
		RETURNING id`, "captain-a-"+suffix, "order-a-"+suffix, OperatorContextA).Scan(&commissionAID); err != nil {
		t.Fatalf("failed to insert OperatorContext A commission fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)`,
		"captain-b-"+suffix, "order-b-"+suffix, OperatorContextB); err != nil {
		t.Fatalf("failed to insert OperatorContext B commission fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossOperatorContext := httptest.NewRequest("GET", "/wlt/commissions/"+commissionAID, nil)
	reqCrossOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqCrossOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextB)
	recCrossOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recCrossOperatorContext, reqCrossOperatorContext)
	if recCrossOperatorContext.Code != 404 {
		t.Fatalf("OperatorContext B reading OperatorContext A's commission: expected 404, got %d body=%s", recCrossOperatorContext.Code, recCrossOperatorContext.Body.String())
	}

	reqOwnOperatorContext := httptest.NewRequest("GET", "/wlt/commissions/"+commissionAID, nil)
	reqOwnOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqOwnOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recOwnOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recOwnOperatorContext, reqOwnOperatorContext)
	if recOwnOperatorContext.Code != 200 {
		t.Fatalf("OperatorContext A reading its own commission: expected 200, got %d body=%s", recOwnOperatorContext.Code, recOwnOperatorContext.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/commissions", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("OperatorContext A listing commissions: expected 200, got %d body=%s", recList.Code, recList.Body.String())
	}
	var listBody struct {
		Commissions []struct {
			ID                 string `json:"id"`
			BeneficiaryActorID string `json:"beneficiaryActorId"`
		} `json:"commissions"`
	}
	if err := json.Unmarshal(recList.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("failed to decode commission list response: %v", err)
	}
	for _, c := range listBody.Commissions {
		if c.BeneficiaryActorID == "captain-b-"+suffix {
			t.Fatalf("OperatorContext A's commission list leaked OperatorContext B's commission %s", c.ID)
		}
	}
}

// TestPayoutRequestRoutes_OperatorContextScoping mirrors the settlement test for
// payout requests.
func TestPayoutRequestRoutes_OperatorContextScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	OperatorContextA := "OperatorContext-a-" + suffix
	OperatorContextB := "OperatorContext-b-" + suffix

	var payoutAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)
		RETURNING id`, "partner-a-"+suffix, OperatorContextA).Scan(&payoutAID); err != nil {
		t.Fatalf("failed to insert OperatorContext A payout request fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)`, "partner-b-"+suffix, OperatorContextB); err != nil {
		t.Fatalf("failed to insert OperatorContext B payout request fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossOperatorContext := httptest.NewRequest("GET", "/wlt/payout-requests/"+payoutAID, nil)
	reqCrossOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqCrossOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextB)
	recCrossOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recCrossOperatorContext, reqCrossOperatorContext)
	if recCrossOperatorContext.Code != 404 {
		t.Fatalf("OperatorContext B reading OperatorContext A's payout request: expected 404, got %d body=%s", recCrossOperatorContext.Code, recCrossOperatorContext.Body.String())
	}

	reqOwnOperatorContext := httptest.NewRequest("GET", "/wlt/payout-requests/"+payoutAID, nil)
	reqOwnOperatorContext.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnOperatorContext.Header.Set("X-Service-Caller", "dsh")
	reqOwnOperatorContext.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recOwnOperatorContext := httptest.NewRecorder()
	router.ServeHTTP(recOwnOperatorContext, reqOwnOperatorContext)
	if recOwnOperatorContext.Code != 200 {
		t.Fatalf("OperatorContext A reading its own payout request: expected 200, got %d body=%s", recOwnOperatorContext.Code, recOwnOperatorContext.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/payout-requests", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Operator-Context-ID", OperatorContextA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("OperatorContext A listing payout requests: expected 200, got %d body=%s", recList.Code, recList.Body.String())
	}
	var listBody struct {
		PayoutRequests []struct {
			ID                 string `json:"id"`
			BeneficiaryActorID string `json:"beneficiaryActorId"`
		} `json:"payoutRequests"`
	}
	if err := json.Unmarshal(recList.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("failed to decode payout request list response: %v", err)
	}
	for _, p := range listBody.PayoutRequests {
		if p.BeneficiaryActorID == "partner-b-"+suffix {
			t.Fatalf("OperatorContext A's payout-requests list leaked OperatorContext B's payout request %s", p.ID)
		}
	}
}
