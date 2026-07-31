package http

import (
	"database/sql"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

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

func authenticatedFinancialRequest(method, path, callerScope string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	if callerScope != "" {
		req.Header.Set("X-Operator-Context-ID", callerScope)
	}
	return req
}

func assertServerOwnedScopeRoute(
	t *testing.T,
	router http.Handler,
	ownPath string,
	foreignPath string,
	listPath string,
	ownID string,
	foreignID string,
) {
	t.Helper()

	ownReq := authenticatedFinancialRequest(http.MethodGet, ownPath, "caller-selected-foreign-scope")
	ownRec := httptest.NewRecorder()
	router.ServeHTTP(ownRec, ownReq)
	if ownRec.Code != http.StatusOK {
		t.Fatalf("server-owned financial record was not readable after caller scope override: status=%d body=%s", ownRec.Code, ownRec.Body.String())
	}
	if got := ownReq.Header.Get("X-Operator-Context-ID"); got != os.Getenv("BTHWANI_OPERATOR_CONTEXT_ID") {
		t.Fatalf("caller-selected scope survived authentication: got=%q", got)
	}

	foreignReq := authenticatedFinancialRequest(http.MethodGet, foreignPath, "legacy-foreign-scope")
	foreignRec := httptest.NewRecorder()
	router.ServeHTTP(foreignRec, foreignReq)
	if foreignRec.Code != http.StatusNotFound {
		t.Fatalf("caller selected a foreign compatibility scope: expected 404, got=%d body=%s", foreignRec.Code, foreignRec.Body.String())
	}

	listReq := authenticatedFinancialRequest(http.MethodGet, listPath, "legacy-foreign-scope")
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("server-owned financial list failed: status=%d body=%s", listRec.Code, listRec.Body.String())
	}
	body := listRec.Body.String()
	if !strings.Contains(body, ownID) {
		t.Fatalf("server-owned financial list omitted its record %s: body=%s", ownID, body)
	}
	if strings.Contains(body, foreignID) {
		t.Fatalf("server-owned financial list leaked foreign compatibility record %s: body=%s", foreignID, body)
	}
}

func TestSettlementRoutesUseServerOwnedFinancialScope(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-settlement-" + suffix
	foreignScope := "foreign-settlement-" + suffix
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", serverScope)

	var ownID, foreignID string
	if err := db.QueryRow(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, operator_context_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)
		RETURNING id`, "partner-own-"+suffix, serverScope).Scan(&ownID); err != nil {
		t.Fatalf("failed to insert server-owned settlement: %v", err)
	}
	if err := db.QueryRow(`
		INSERT INTO wlt_settlements (partner_id, period_start, period_end, operator_context_id)
		VALUES ($1, '2026-01-01', '2026-01-31', $2)
		RETURNING id`, "partner-foreign-"+suffix, foreignScope).Scan(&foreignID); err != nil {
		t.Fatalf("failed to insert foreign compatibility settlement: %v", err)
	}
	defer db.Exec(`DELETE FROM wlt_settlements WHERE id IN ($1,$2)`, ownID, foreignID)

	router := NewRouter(db, true)
	assertServerOwnedScopeRoute(t, router,
		"/wlt/settlements/"+ownID,
		"/wlt/settlements/"+foreignID,
		"/wlt/settlements",
		ownID, foreignID,
	)
}

func TestCodRecordRoutesUseServerOwnedFinancialScope(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-cod-" + suffix
	foreignScope := "foreign-cod-" + suffix
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", serverScope)

	var ownID, foreignID string
	if err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)
		RETURNING id`, "order-own-"+suffix, "captain-own-"+suffix, "partner-own-"+suffix, serverScope).Scan(&ownID); err != nil {
		t.Fatalf("failed to insert server-owned COD record: %v", err)
	}
	if err := db.QueryRow(`
		INSERT INTO wlt_cod_records (order_id, collector_type, collector_id, partner_id, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', $2, $3, 1000, 'YER', $4)
		RETURNING id`, "order-foreign-"+suffix, "captain-foreign-"+suffix, "partner-foreign-"+suffix, foreignScope).Scan(&foreignID); err != nil {
		t.Fatalf("failed to insert foreign compatibility COD record: %v", err)
	}
	defer db.Exec(`DELETE FROM wlt_cod_records WHERE id IN ($1,$2)`, ownID, foreignID)

	router := NewRouter(db, true)
	assertServerOwnedScopeRoute(t, router,
		"/wlt/cod-records/"+ownID,
		"/wlt/cod-records/"+foreignID,
		"/wlt/cod-records",
		ownID, foreignID,
	)
}

func TestCommissionRoutesUseServerOwnedFinancialScope(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-commission-" + suffix
	foreignScope := "foreign-commission-" + suffix
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", serverScope)

	var ownID, foreignID string
	if err := db.QueryRow(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)
		RETURNING id`, "captain-own-"+suffix, "order-own-"+suffix, serverScope).Scan(&ownID); err != nil {
		t.Fatalf("failed to insert server-owned commission: %v", err)
	}
	if err := db.QueryRow(`
		INSERT INTO wlt_commissions (beneficiary_actor_id, beneficiary_actor_type, source_type, source_id, commission_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'captain', 'order', $2, 'delivery_fee', 500, 'YER', $3)
		RETURNING id`, "captain-foreign-"+suffix, "order-foreign-"+suffix, foreignScope).Scan(&foreignID); err != nil {
		t.Fatalf("failed to insert foreign compatibility commission: %v", err)
	}
	defer db.Exec(`DELETE FROM wlt_commissions WHERE id IN ($1,$2)`, ownID, foreignID)

	router := NewRouter(db, true)
	assertServerOwnedScopeRoute(t, router,
		"/wlt/commissions/"+ownID,
		"/wlt/commissions/"+foreignID,
		"/wlt/commissions",
		ownID, foreignID,
	)
}

func TestPayoutRequestRoutesUseServerOwnedFinancialScope(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-payout-" + suffix
	foreignScope := "foreign-payout-" + suffix
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", serverScope)

	var ownID, foreignID string
	if err := db.QueryRow(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)
		RETURNING id`, "partner-own-"+suffix, serverScope).Scan(&ownID); err != nil {
		t.Fatalf("failed to insert server-owned payout request: %v", err)
	}
	if err := db.QueryRow(`
		INSERT INTO wlt_payout_requests (beneficiary_actor_id, beneficiary_actor_type, amount_minor_units, currency, operator_context_id)
		VALUES ($1, 'partner', 1000, 'YER', $2)
		RETURNING id`, "partner-foreign-"+suffix, foreignScope).Scan(&foreignID); err != nil {
		t.Fatalf("failed to insert foreign compatibility payout request: %v", err)
	}
	defer db.Exec(`DELETE FROM wlt_payout_requests WHERE id IN ($1,$2)`, ownID, foreignID)

	router := NewRouter(db, true)
	assertServerOwnedScopeRoute(t, router,
		"/wlt/payout-requests/"+ownID,
		"/wlt/payout-requests/"+foreignID,
		"/wlt/payout-requests",
		ownID, foreignID,
	)
}
