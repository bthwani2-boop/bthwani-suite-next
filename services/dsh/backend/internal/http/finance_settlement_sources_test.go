package http

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"dsh-api/internal/store"
	"dsh-api/internal/wlt"
	_ "github.com/lib/pq"
)

func financeSettlementActorRequest(method, target string, body []byte) *http.Request {
	request := httptest.NewRequest(method, target, bytes.NewReader(body))
	return partnerRequestWithActor(request, store.StoreActor{
		ID:                "operator-finance-1",
		Role:              "operator",
		OperatorContextID: "operator-context-finance",
		SessionSurface:    "control-panel",
	})
}

func TestHandleUpsertFinanceSettlementPolicyUsesTrustedOperatorContextAndCanonicalWLTRoute(t *testing.T) {
	var gotPayload map[string]any
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPut || r.URL.Path != "/wlt/settlement-policies/partner-finance-1" {
			t.Fatalf("unexpected WLT request: %s %s", r.Method, r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer finance-service-token" {
			t.Fatalf("Authorization = %q", got)
		}
		if got := r.Header.Get("X-Service-Caller"); got != "dsh" {
			t.Fatalf("X-Service-Caller = %q", got)
		}
		if got := r.Header.Get("X-Delegated-Operator-Context"); got != "operator-context-finance" {
			t.Fatalf("X-Delegated-Operator-Context = %q", got)
		}
		if got := r.Header.Get("X-Correlation-ID"); got != "correlation-finance-1" {
			t.Fatalf("X-Correlation-ID = %q", got)
		}
		if got := r.Header.Get("Idempotency-Key"); got != "idempotency-finance-1" {
			t.Fatalf("Idempotency-Key = %q", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&gotPayload); err != nil {
			t.Fatalf("decode WLT payload: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"settlementPolicy":{"partnerId":"partner-finance-1","currency":"YER"}}`))
	}))
	defer upstream.Close()

	s := &protectedStoreServer{wlt: wlt.NewClient(upstream.URL, "finance-service-token")}
	req := financeSettlementActorRequest(http.MethodPut, "/dsh/control-panel/finance/settlement-policies/partner-finance-1", []byte(`{"feeBasisPoints":125,"currency":"yer","status":"ACTIVE","cycleDays":14,"minimumNetMinorUnits":500,"changeReason":"quarterly policy"}`))
	req.SetPathValue("partnerId", "partner-finance-1")
	req.Header.Set("X-Correlation-ID", "correlation-finance-1")
	req.Header.Set("Idempotency-Key", "idempotency-finance-1")
	rec := httptest.NewRecorder()

	s.handleUpsertFinanceSettlementPolicy(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if gotPayload["operatorId"] != "operator-finance-1" || gotPayload["status"] != "active" {
		t.Fatalf("WLT payload lost canonical operator/status: %#v", gotPayload)
	}
	if got := rec.Header().Get("Cache-Control"); got != "no-store" {
		t.Fatalf("Cache-Control = %q", got)
	}
}

func TestHandleUpsertFinanceSettlementPolicyRejectsInvalidBoundaryInputs(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatalf("invalid request reached WLT: %s %s", r.Method, r.URL.Path)
	}))
	defer upstream.Close()
	s := &protectedStoreServer{wlt: wlt.NewClient(upstream.URL, "finance-service-token")}

	tests := map[string]struct {
		target string
		body   string
	}{
		"missing partner path": {
			target: "/dsh/control-panel/finance/settlement-policies/",
			body:   `{"feeBasisPoints":100,"changeReason":"reason"}`,
		},
		"unknown field": {
			target: "/dsh/control-panel/finance/settlement-policies/partner-1",
			body:   `{"feeBasisPoints":100,"changeReason":"reason","unexpected":true}`,
		},
		"invalid fee": {
			target: "/dsh/control-panel/finance/settlement-policies/partner-1",
			body:   `{"feeBasisPoints":10001,"changeReason":"reason"}`,
		},
		"negative minimum": {
			target: "/dsh/control-panel/finance/settlement-policies/partner-1",
			body:   `{"feeBasisPoints":100,"minimumNetMinorUnits":-1,"changeReason":"reason"}`,
		},
		"invalid cycle": {
			target: "/dsh/control-panel/finance/settlement-policies/partner-1",
			body:   `{"feeBasisPoints":100,"cycleDays":367,"changeReason":"reason"}`,
		},
		"missing change reason": {
			target: "/dsh/control-panel/finance/settlement-policies/partner-1",
			body:   `{"feeBasisPoints":100}`,
		},
	}

	for name, test := range tests {
		t.Run(name, func(t *testing.T) {
			req := financeSettlementActorRequest(http.MethodPut, test.target, []byte(test.body))
			if strings.HasSuffix(test.target, "/partner-1") {
				req.SetPathValue("partnerId", "partner-1")
			}
			rec := httptest.NewRecorder()
			s.handleUpsertFinanceSettlementPolicy(rec, req)
			if rec.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
			}
		})
	}
}

func TestHandleCreateFinanceSettlementFromDeliveredOrdersFailsClosedWithoutEligibleSources(t *testing.T) {
	if os.Getenv("DSH_REQUIRE_DB_TESTS") != "true" {
		t.Skip("set DSH_REQUIRE_DB_TESTS=true to run DSH DB integration tests")
	}
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		t.Fatal("DATABASE_URL is required when DSH_REQUIRE_DB_TESTS=true")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	if err := db.Ping(); err != nil {
		t.Fatal(err)
	}

	upstreamHits := 0
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamHits++
		t.Fatalf("no-eligible request reached WLT: %s %s", r.Method, r.URL.Path)
	}))
	defer upstream.Close()
	s := &protectedStoreServer{db: db, wlt: wlt.NewClient(upstream.URL, "finance-service-token")}
	partnerID := "partner-no-eligible-" + strings.ReplaceAll(time.Now().UTC().Format("20060102150405.000000000"), ".", "-")
	req := financeSettlementActorRequest(http.MethodPost, "/dsh/control-panel/finance/settlements/from-delivered-orders", []byte(`{"partnerId":"`+partnerID+`","periodStart":"2025-01-01","periodEnd":"2025-01-31"}`))
	rec := httptest.NewRecorder()

	s.handleCreateFinanceSettlementFromDeliveredOrders(rec, req)

	if rec.Code != http.StatusConflict {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "NO_ELIGIBLE_DELIVERED_ORDERS") {
		t.Fatalf("body = %s", rec.Body.String())
	}
	if upstreamHits != 0 {
		t.Fatalf("WLT upstream hits = %d, want 0", upstreamHits)
	}
}
