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

func newTenantScopedRequest(method, path, tenantID string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	if tenantID != "" {
		req.Header.Set("X-Tenant-ID", tenantID)
	}
	return httptest.NewRecorder()
}

func doTenantScopedRequest(router interface {
	ServeHTTP(w interface {
		Header() map[string][]string
	}, r interface{})
}, w, r interface{}) {
}

// TestSettlementRoutes_TenantScoping proves: (1) a GET for another tenant's
// settlement id returns 404 (never 403 -- tenancy must not become an
// identifier-enumeration oracle), that tenant's own request succeeds, and
// (2) the unfiltered list route only returns rows owned by the trusted
// tenant even though a legacy-unscoped row and another tenant's row also
// exist in the table.
func TestSettlementRoutes_TenantScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix
	partnerA := "partner-a-" + suffix

	var settlementAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, tenant_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)
		RETURNING id`, partnerA, tenantA).Scan(&settlementAID); err != nil {
		t.Fatalf("failed to insert tenant A settlement fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, tenant_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)`, "partner-b-"+suffix, tenantB); err != nil {
		t.Fatalf("failed to insert tenant B settlement fixture: %v", err)
	}

	router := NewRouter(db, true)

	// Tenant B requesting tenant A's settlement by id must get 404.
	reqCrossTenant := httptest.NewRequest("GET", "/wlt/settlements/"+settlementAID, nil)
	reqCrossTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossTenant.Header.Set("X-Service-Caller", "dsh")
	reqCrossTenant.Header.Set("X-Tenant-ID", tenantB)
	recCrossTenant := httptest.NewRecorder()
	router.ServeHTTP(recCrossTenant, reqCrossTenant)
	if recCrossTenant.Code != 404 {
		t.Fatalf("tenant B reading tenant A's settlement: expected 404, got %d body=%s", recCrossTenant.Code, recCrossTenant.Body.String())
	}

	// Tenant A requesting its own settlement must succeed.
	reqOwnTenant := httptest.NewRequest("GET", "/wlt/settlements/"+settlementAID, nil)
	reqOwnTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnTenant.Header.Set("X-Service-Caller", "dsh")
	reqOwnTenant.Header.Set("X-Tenant-ID", tenantA)
	recOwnTenant := httptest.NewRecorder()
	router.ServeHTTP(recOwnTenant, reqOwnTenant)
	if recOwnTenant.Code != 200 {
		t.Fatalf("tenant A reading its own settlement: expected 200, got %d body=%s", recOwnTenant.Code, recOwnTenant.Body.String())
	}

	// The unfiltered list route must only return tenant A's rows.
	reqList := httptest.NewRequest("GET", "/wlt/settlements", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Tenant-ID", tenantA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("tenant A listing settlements: expected 200, got %d body=%s", recList.Code, recList.Body.String())
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
			t.Fatalf("tenant A's settlement list leaked tenant B's settlement %s", s.ID)
		}
	}
	found := false
	for _, s := range listBody.Settlements {
		if s.ID == settlementAID {
			found = true
		}
	}
	if !found {
		t.Fatalf("tenant A's settlement list did not include tenant A's own settlement %s", settlementAID)
	}
}

// TestCodRecordRoutes_TenantScoping mirrors the settlement test for COD
// records: cross-tenant get-by-id is a 404, own-tenant get-by-id succeeds,
// and the list route never leaks another tenant's row.
func TestCodRecordRoutes_TenantScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix
	partnerA := "partner-a-" + suffix

	var codAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)
		RETURNING id`, "order-a-"+suffix, "captain-a-"+suffix, partnerA, tenantA).Scan(&codAID); err != nil {
		t.Fatalf("failed to insert tenant A cod record fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)`,
		"order-b-"+suffix, "captain-b-"+suffix, "partner-b-"+suffix, tenantB); err != nil {
		t.Fatalf("failed to insert tenant B cod record fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossTenant := httptest.NewRequest("GET", "/wlt/cod-records/"+codAID, nil)
	reqCrossTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossTenant.Header.Set("X-Service-Caller", "dsh")
	reqCrossTenant.Header.Set("X-Tenant-ID", tenantB)
	recCrossTenant := httptest.NewRecorder()
	router.ServeHTTP(recCrossTenant, reqCrossTenant)
	if recCrossTenant.Code != 404 {
		t.Fatalf("tenant B reading tenant A's cod record: expected 404, got %d body=%s", recCrossTenant.Code, recCrossTenant.Body.String())
	}

	reqOwnTenant := httptest.NewRequest("GET", "/wlt/cod-records/"+codAID, nil)
	reqOwnTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnTenant.Header.Set("X-Service-Caller", "dsh")
	reqOwnTenant.Header.Set("X-Tenant-ID", tenantA)
	recOwnTenant := httptest.NewRecorder()
	router.ServeHTTP(recOwnTenant, reqOwnTenant)
	if recOwnTenant.Code != 200 {
		t.Fatalf("tenant A reading its own cod record: expected 200, got %d body=%s", recOwnTenant.Code, recOwnTenant.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/cod-records?partnerId="+partnerA, nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Tenant-ID", tenantB)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("tenant B listing by tenant A's partnerId: expected 200, got %d body=%s", recList.Code, recList.Body.String())
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
		t.Fatalf("tenant B's cod-records list leaked tenant A's partnerId-filtered rows: %+v", listBody.CodRecords)
	}
}

// TestCommissionRoutes_TenantScoping mirrors the settlement test for
// commissions.
func TestCommissionRoutes_TenantScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix

	var commissionAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)
		RETURNING id`, "captain-a-"+suffix, "order-a-"+suffix, tenantA).Scan(&commissionAID); err != nil {
		t.Fatalf("failed to insert tenant A commission fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)`,
		"captain-b-"+suffix, "order-b-"+suffix, tenantB); err != nil {
		t.Fatalf("failed to insert tenant B commission fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossTenant := httptest.NewRequest("GET", "/wlt/commissions/"+commissionAID, nil)
	reqCrossTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossTenant.Header.Set("X-Service-Caller", "dsh")
	reqCrossTenant.Header.Set("X-Tenant-ID", tenantB)
	recCrossTenant := httptest.NewRecorder()
	router.ServeHTTP(recCrossTenant, reqCrossTenant)
	if recCrossTenant.Code != 404 {
		t.Fatalf("tenant B reading tenant A's commission: expected 404, got %d body=%s", recCrossTenant.Code, recCrossTenant.Body.String())
	}

	reqOwnTenant := httptest.NewRequest("GET", "/wlt/commissions/"+commissionAID, nil)
	reqOwnTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnTenant.Header.Set("X-Service-Caller", "dsh")
	reqOwnTenant.Header.Set("X-Tenant-ID", tenantA)
	recOwnTenant := httptest.NewRecorder()
	router.ServeHTTP(recOwnTenant, reqOwnTenant)
	if recOwnTenant.Code != 200 {
		t.Fatalf("tenant A reading its own commission: expected 200, got %d body=%s", recOwnTenant.Code, recOwnTenant.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/commissions", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Tenant-ID", tenantA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("tenant A listing commissions: expected 200, got %d body=%s", recList.Code, recList.Body.String())
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
			t.Fatalf("tenant A's commission list leaked tenant B's commission %s", c.ID)
		}
	}
}

// TestPayoutRequestRoutes_TenantScoping mirrors the settlement test for
// payout requests.
func TestPayoutRequestRoutes_TenantScoping(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	tenantA := "tenant-a-" + suffix
	tenantB := "tenant-b-" + suffix

	var payoutAID string
	if err := db.QueryRow(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)
		RETURNING id`, "partner-a-"+suffix, tenantA).Scan(&payoutAID); err != nil {
		t.Fatalf("failed to insert tenant A payout request fixture: %v", err)
	}
	if _, err := db.Exec(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, tenant_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)`, "partner-b-"+suffix, tenantB); err != nil {
		t.Fatalf("failed to insert tenant B payout request fixture: %v", err)
	}

	router := NewRouter(db, true)

	reqCrossTenant := httptest.NewRequest("GET", "/wlt/payout-requests/"+payoutAID, nil)
	reqCrossTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqCrossTenant.Header.Set("X-Service-Caller", "dsh")
	reqCrossTenant.Header.Set("X-Tenant-ID", tenantB)
	recCrossTenant := httptest.NewRecorder()
	router.ServeHTTP(recCrossTenant, reqCrossTenant)
	if recCrossTenant.Code != 404 {
		t.Fatalf("tenant B reading tenant A's payout request: expected 404, got %d body=%s", recCrossTenant.Code, recCrossTenant.Body.String())
	}

	reqOwnTenant := httptest.NewRequest("GET", "/wlt/payout-requests/"+payoutAID, nil)
	reqOwnTenant.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqOwnTenant.Header.Set("X-Service-Caller", "dsh")
	reqOwnTenant.Header.Set("X-Tenant-ID", tenantA)
	recOwnTenant := httptest.NewRecorder()
	router.ServeHTTP(recOwnTenant, reqOwnTenant)
	if recOwnTenant.Code != 200 {
		t.Fatalf("tenant A reading its own payout request: expected 200, got %d body=%s", recOwnTenant.Code, recOwnTenant.Body.String())
	}

	reqList := httptest.NewRequest("GET", "/wlt/payout-requests", nil)
	reqList.Header.Set("Authorization", "Bearer test-dsh-service-token")
	reqList.Header.Set("X-Service-Caller", "dsh")
	reqList.Header.Set("X-Tenant-ID", tenantA)
	recList := httptest.NewRecorder()
	router.ServeHTTP(recList, reqList)
	if recList.Code != 200 {
		t.Fatalf("tenant A listing payout requests: expected 200, got %d body=%s", recList.Code, recList.Body.String())
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
			t.Fatalf("tenant A's payout-requests list leaked tenant B's payout request %s", p.ID)
		}
	}
}
