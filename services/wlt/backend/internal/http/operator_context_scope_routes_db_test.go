package http

import (
	"database/sql"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	_ "github.com/lib/pq"

	"wlt-api/internal/testsupport"
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
	return testsupport.UniqueSuffix()
}

func requireTestTable(t *testing.T, db *sql.DB, table string) {
	t.Helper()
	var exists bool
	if err := db.QueryRow(`SELECT to_regclass($1) IS NOT NULL`, "public."+table).Scan(&exists); err != nil {
		t.Fatalf("failed to inspect test table %s: %v", table, err)
	}
	if !exists {
		if os.Getenv("WLT_REQUIRE_DB_TESTS") == "true" {
			t.Fatalf("required WLT test table %s is missing", table)
		}
		t.Skipf("Skipping DB integration test: WLT test table %s is missing", table)
	}
}

func authenticatedFinancialRequest(method, path, callerScope string) *http.Request {
	req := httptest.NewRequest(method, path, nil)
	req.Header.Set("Authorization", "Bearer test-dsh-service-token")
	req.Header.Set("X-Service-Caller", "dsh")
	if callerScope != "" {
		req.Header.Set("X-Delegated-Operator-Context", callerScope)
	}
	return req
}

func assertDelegatedScopeRoute(
	t *testing.T,
	router http.Handler,
	ownPath string,
	foreignPath string,
	listPath string,
	ownID string,
	foreignID string,
	delegatedScope string,
) {
	t.Helper()

	ownReq := authenticatedFinancialRequest(http.MethodGet, ownPath, delegatedScope)
	ownRec := httptest.NewRecorder()
	router.ServeHTTP(ownRec, ownReq)
	if ownRec.Code != http.StatusOK {
		t.Fatalf("delegated financial record was not readable: status=%d body=%s", ownRec.Code, ownRec.Body.String())
	}
	if got := ownReq.Header.Get("X-Delegated-Operator-Context"); got != delegatedScope {
		t.Fatalf("delegated scope changed after authentication: got=%q want=%q", got, delegatedScope)
	}

	foreignReq := authenticatedFinancialRequest(http.MethodGet, foreignPath, delegatedScope)
	foreignRec := httptest.NewRecorder()
	router.ServeHTTP(foreignRec, foreignReq)
	if foreignRec.Code != http.StatusNotFound {
		t.Fatalf("delegated scope read a foreign record: expected 404, got=%d body=%s", foreignRec.Code, foreignRec.Body.String())
	}

	listReq := authenticatedFinancialRequest(http.MethodGet, listPath, delegatedScope)
	listRec := httptest.NewRecorder()
	router.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("delegated financial list failed: status=%d body=%s", listRec.Code, listRec.Body.String())
	}
	body := listRec.Body.String()
	if !strings.Contains(body, ownID) {
		t.Fatalf("delegated financial list omitted its record %s: body=%s", ownID, body)
	}
	if strings.Contains(body, foreignID) {
		t.Fatalf("delegated financial list leaked foreign record %s: body=%s", foreignID, body)
	}
}

func TestSettlementRoutesIsolateDelegatedFinancialScopes(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	requireTestTable(t, db, "wlt_settlements")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-settlement-" + suffix
	foreignScope := "foreign-settlement-" + suffix
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

	router := NewRouter(db, true, nil)
	assertDelegatedScopeRoute(t, router,
		"/wlt/settlements/"+ownID,
		"/wlt/settlements/"+foreignID,
		"/wlt/settlements",
		ownID, foreignID, serverScope,
	)
	assertDelegatedScopeRoute(t, router, "/wlt/settlements/"+foreignID, "/wlt/settlements/"+ownID, "/wlt/settlements", foreignID, ownID, foreignScope)
}

func TestCommissionRoutesIsolateDelegatedFinancialScopes(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	requireTestTable(t, db, "wlt_commissions")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-commission-" + suffix
	foreignScope := "foreign-commission-" + suffix
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

	router := NewRouter(db, true, nil)
	assertDelegatedScopeRoute(t, router,
		"/wlt/commissions/"+ownID,
		"/wlt/commissions/"+foreignID,
		"/wlt/commissions",
		ownID, foreignID, serverScope,
	)
	assertDelegatedScopeRoute(t, router, "/wlt/commissions/"+foreignID, "/wlt/commissions/"+ownID, "/wlt/commissions", foreignID, ownID, foreignScope)
}

func TestPayoutRequestRoutesIsolateDelegatedFinancialScopes(t *testing.T) {
	db := getTestDB(t)
	if db == nil {
		return
	}
	defer db.Close()
	requireTestTable(t, db, "wlt_payout_requests")
	t.Setenv("WLT_DSH_SERVICE_TOKEN", "test-dsh-service-token")

	suffix := uniqueSuffix()
	serverScope := "server-payout-" + suffix
	foreignScope := "foreign-payout-" + suffix
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

	router := NewRouter(db, true, nil)
	assertDelegatedScopeRoute(t, router,
		"/wlt/payout-requests/"+ownID,
		"/wlt/payout-requests/"+foreignID,
		"/wlt/payout-requests",
		ownID, foreignID, serverScope,
	)
	assertDelegatedScopeRoute(t, router, "/wlt/payout-requests/"+foreignID, "/wlt/payout-requests/"+ownID, "/wlt/payout-requests", foreignID, ownID, foreignScope)
}
