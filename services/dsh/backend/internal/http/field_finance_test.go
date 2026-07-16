package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/wlt"
)

// fieldFinanceServer wires a protectedStoreServer against a fake Identity
// server (authenticating the request as a "field" actor) and a fake WLT
// server (capturing the outbound request DSH makes), so the field-finance
// handlers can be exercised end-to-end without a live Identity/WLT
// deployment.
func fieldFinanceServer(t *testing.T, actorID string, wltHandler http.HandlerFunc) (*protectedStoreServer, *httptest.Server) {
	t.Helper()
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   actorID,
			TenantID:  "dsh",
			Roles:     []string{"field"},
			AuthState: "authenticated",
		})
	}))
	t.Cleanup(identityServer.Close)

	wltServer := httptest.NewServer(wltHandler)
	t.Cleanup(wltServer.Close)

	return &protectedStoreServer{
		identity: auth.NewClient(identityServer.URL),
		wlt:      wlt.NewClient(wltServer.URL, "test-service-token"),
	}, wltServer
}

func TestHandleFieldMeWalletCallsPathBasedWalletRoute(t *testing.T) {
	var gotPath, gotQuery string
	s, _ := fieldFinanceServer(t, "field-1", func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"balanceMinorUnits":100}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/field/me/finance/wallet", nil)
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	s.handleFieldMeWallet(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
	if gotPath != "/wlt/wallets/field/field-1" {
		t.Fatalf("expected WLT path /wlt/wallets/field/field-1, got %q", gotPath)
	}
	if gotQuery != "" {
		t.Fatalf("expected no query params on path-based wallet call, got %q", gotQuery)
	}
}

func TestHandleFieldMeCommissionsSendsBeneficiaryIDAndType(t *testing.T) {
	var gotQuery string
	s, _ := fieldFinanceServer(t, "field-2", func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"commissions":[]}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/field/me/finance/commissions", nil)
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	s.handleFieldMeCommissions(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
	q, err := url.ParseQuery(gotQuery)
	if err != nil {
		t.Fatalf("failed to parse query %q: %v", gotQuery, err)
	}
	if q.Get("beneficiaryActorId") != "field-2" {
		t.Fatalf("expected beneficiaryActorId=field-2, got %q", q.Get("beneficiaryActorId"))
	}
	if q.Get("beneficiaryActorType") != "field" {
		t.Fatalf("expected beneficiaryActorType=field, got %q", q.Get("beneficiaryActorType"))
	}
}

func TestHandleFieldMePayoutRequestsSendsBeneficiaryIDAndType(t *testing.T) {
	var gotQuery string
	s, _ := fieldFinanceServer(t, "field-3", func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"payoutRequests":[]}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/field/me/finance/payout-requests", nil)
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	s.handleFieldMePayoutRequests(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
	q, err := url.ParseQuery(gotQuery)
	if err != nil {
		t.Fatalf("failed to parse query %q: %v", gotQuery, err)
	}
	if q.Get("beneficiaryActorId") != "field-3" {
		t.Fatalf("expected beneficiaryActorId=field-3, got %q", q.Get("beneficiaryActorId"))
	}
	if q.Get("beneficiaryActorType") != "field" {
		t.Fatalf("expected beneficiaryActorType=field, got %q", q.Get("beneficiaryActorType"))
	}
}

func TestHandleFieldMeLedgerEntriesStillUsesActorIDAndType(t *testing.T) {
	// WLT's ledger/entries endpoint expects actorId/actorType (not the
	// beneficiaryActorId/beneficiaryActorType scheme used by
	// commissions/payout-requests) -- this must remain unchanged.
	var gotQuery string
	s, _ := fieldFinanceServer(t, "field-4", func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"ledgerEntries":[]}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/field/me/finance/ledger-entries", nil)
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	s.handleFieldMeLedgerEntries(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d, body=%s", rec.Code, rec.Body.String())
	}
	q, err := url.ParseQuery(gotQuery)
	if err != nil {
		t.Fatalf("failed to parse query %q: %v", gotQuery, err)
	}
	if q.Get("actorId") != "field-4" {
		t.Fatalf("expected actorId=field-4, got %q", q.Get("actorId"))
	}
	if q.Get("actorType") != "field" {
		t.Fatalf("expected actorType=field, got %q", q.Get("actorType"))
	}
}

func TestHandleSubmitFieldMePayoutRequestForwardsFullWltResponse(t *testing.T) {
	s, _ := fieldFinanceServer(t, "field-5", func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]any
		_ = json.NewDecoder(r.Body).Decode(&payload)
		if payload["beneficiaryActorId"] != "field-5" || payload["beneficiaryActorType"] != "field" {
			t.Fatalf("unexpected outbound payload: %+v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"id":"payout-1","status":"pending","amountMinorUnits":500,"currency":"YER"}`))
	})

	reqBody := `{"amountMinorUnits":500,"currency":"YER","idempotencyKey":"idem-1"}`
	req := httptest.NewRequest(http.MethodPost, "/dsh/field/me/finance/payout-requests", strings.NewReader(reqBody))
	req.Header.Set("Authorization", "Bearer valid-field-token")
	rec := httptest.NewRecorder()

	s.handleSubmitFieldMePayoutRequest(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 forwarded from WLT, got %d, body=%s", rec.Code, rec.Body.String())
	}
	var got map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}
	if got["id"] != "payout-1" || got["status"] != "pending" {
		t.Fatalf("expected DSH to forward the full WLT payout-request body verbatim, got %+v", got)
	}
}
