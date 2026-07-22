package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/wlt"
)

func representativeFinanceRouter(
	t *testing.T,
	role string,
	actorID string,
	wltHandler http.HandlerFunc,
) *http.ServeMux {
	t.Helper()
	identityServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(auth.Identity{
			Subject:   actorID,
			TenantID:  "dsh",
			Roles:     []string{role},
			AuthState: "authenticated",
		})
	}))
	t.Cleanup(identityServer.Close)

	wltServer := httptest.NewServer(wltHandler)
	t.Cleanup(wltServer.Close)

	return NewRouter(
		nil,
		auth.NewClient(identityServer.URL),
		wlt.NewClient(wltServer.URL, "test-service-token"),
		nil,
	)
}

func TestRepresentativeOwnWalletRoutesResolveAuthenticatedActor(t *testing.T) {
	cases := []struct {
		actorType string
		actorID   string
		path      string
	}{
		{actorType: "client", actorID: "client-1", path: "/dsh/client/me/finance/wallet"},
		{actorType: "partner", actorID: "partner-1", path: "/dsh/partner/me/finance/wallet"},
		{actorType: "captain", actorID: "captain-1", path: "/dsh/captain/me/finance/wallet"},
		{actorType: "field", actorID: "field-1", path: "/dsh/field/me/finance/wallet"},
	}

	for _, tc := range cases {
		t.Run(tc.actorType, func(t *testing.T) {
			var mu sync.Mutex
			gotPath := ""
			gotTenant := ""
			router := representativeFinanceRouter(t, tc.actorType, tc.actorID, func(w http.ResponseWriter, r *http.Request) {
				mu.Lock()
				gotPath = r.URL.Path
				gotTenant = r.Header.Get("X-Tenant-ID")
				mu.Unlock()
				w.Header().Set("Content-Type", "application/json")
				_, _ = w.Write([]byte(`{"wallet":{"actorId":"` + tc.actorID + `","actorType":"` + tc.actorType + `"}}`))
			})

			req := httptest.NewRequest(http.MethodGet, tc.path, nil)
			req.Header.Set("Authorization", "Bearer valid-token")
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
			}
			mu.Lock()
			defer mu.Unlock()
			expected := "/wlt/wallets/" + tc.actorType + "/" + tc.actorID
			if gotPath != expected {
				t.Fatalf("expected WLT path %q, got %q", expected, gotPath)
			}
			if gotTenant != "dsh" {
				t.Fatalf("expected Identity tenant dsh, got %q", gotTenant)
			}
			if rec.Header().Get("Cache-Control") != "private, no-store" {
				t.Fatalf("expected no-store response, got %q", rec.Header().Get("Cache-Control"))
			}
		})
	}
}

func TestRepresentativeOwnLedgerRoutesOverrideActorQuery(t *testing.T) {
	var gotQuery string
	var gotTenant string
	router := representativeFinanceRouter(t, "captain", "captain-7", func(w http.ResponseWriter, r *http.Request) {
		gotQuery = r.URL.RawQuery
		gotTenant = r.Header.Get("X-Tenant-ID")
		_, _ = w.Write([]byte(`{"ledgerEntries":[]}`))
	})

	req := httptest.NewRequest(
		http.MethodGet,
		"/dsh/captain/me/finance/ledger-entries?actorId=other&actorType=field&entryType=earning&limit=10",
		nil,
	)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(gotQuery, "actorId=captain-7") || !strings.Contains(gotQuery, "actorType=captain") {
		t.Fatalf("expected resolved captain scope, got %q", gotQuery)
	}
	if strings.Contains(gotQuery, "other") || strings.Contains(gotQuery, "actorType=field") {
		t.Fatalf("frontend actor query must not pass through, got %q", gotQuery)
	}
	if gotTenant != "dsh" {
		t.Fatalf("expected Identity tenant dsh, got %q", gotTenant)
	}
	if rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("expected no-store ledger response, got %q", rec.Header().Get("Cache-Control"))
	}
}

func TestControlPanelRepresentativeWalletValidatesTypeAndUsesPermissionFallback(t *testing.T) {
	var gotPath string
	var gotTenant string
	router := representativeFinanceRouter(t, "operator", "operator-1", func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotTenant = r.Header.Get("X-Tenant-ID")
		_, _ = w.Write([]byte(`{"wallet":{"actorId":"client-9","actorType":"client"}}`))
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/wallets/client/client-9", nil)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if gotPath != "/wlt/wallets/client/client-9" {
		t.Fatalf("unexpected WLT wallet path %q", gotPath)
	}
	if gotTenant != "dsh" {
		t.Fatalf("expected operator Identity tenant dsh, got %q", gotTenant)
	}

	invalid := httptest.NewRequest(http.MethodGet, "/dsh/control-panel/finance/wallets/operator/operator-2", nil)
	invalid.Header.Set("Authorization", "Bearer valid-token")
	invalidRec := httptest.NewRecorder()
	router.ServeHTTP(invalidRec, invalid)
	if invalidRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsupported actor, got %d: %s", invalidRec.Code, invalidRec.Body.String())
	}
}

func TestControlPanelRepresentativeLedgerPinsActorAndNoStore(t *testing.T) {
	var gotPath string
	var gotQuery string
	var gotTenant string
	router := representativeFinanceRouter(t, "operator", "operator-1", func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		gotQuery = r.URL.RawQuery
		gotTenant = r.Header.Get("X-Tenant-ID")
		_, _ = w.Write([]byte(`{"ledgerEntries":[]}`))
	})

	req := httptest.NewRequest(
		http.MethodGet,
		"/dsh/control-panel/finance/wallets/partner/partner-8/ledger-entries?actorId=other&actorType=field&entryType=settlement&limit=25",
		nil,
	)
	req.Header.Set("Authorization", "Bearer valid-token")
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if gotPath != "/wlt/ledger/entries" {
		t.Fatalf("expected WLT ledger route, got %q", gotPath)
	}
	if !strings.Contains(gotQuery, "actorId=partner-8") || !strings.Contains(gotQuery, "actorType=partner") {
		t.Fatalf("expected path-scoped partner identity, got %q", gotQuery)
	}
	if strings.Contains(gotQuery, "other") || strings.Contains(gotQuery, "actorType=field") {
		t.Fatalf("query actor override must be ignored, got %q", gotQuery)
	}
	if !strings.Contains(gotQuery, "entryType=settlement") || !strings.Contains(gotQuery, "limit=25") {
		t.Fatalf("expected allowlisted ledger filters, got %q", gotQuery)
	}
	if gotTenant != "dsh" {
		t.Fatalf("expected operator Identity tenant dsh, got %q", gotTenant)
	}
	if rec.Header().Get("Cache-Control") != "private, no-store" {
		t.Fatalf("expected no-store operator ledger response, got %q", rec.Header().Get("Cache-Control"))
	}
}
