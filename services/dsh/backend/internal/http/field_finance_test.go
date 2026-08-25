package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
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
			Subject:           actorID,
			OperatorContextID: "dsh",
			Roles:             []string{"field"},
			AuthState:         "authenticated",
			SessionSurface:    "app-field",
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

func requireFieldFinanceOperatorContext(t *testing.T, r *http.Request) {
	t.Helper()
	if got := r.Header.Get("X-Delegated-Operator-Context"); got != "dsh" {
		t.Fatalf("expected delegated Identity OperatorContext dsh, got %q", got)
	}
	if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
		t.Fatalf("legacy OperatorContext header must not be emitted, got %q", got)
	}
}

func TestHandleFieldMeCommissionsSendsBeneficiaryIDTypeAndOperatorContext(t *testing.T) {
	var gotQuery string
	s, _ := fieldFinanceServer(t, "field-2", func(w http.ResponseWriter, r *http.Request) {
		requireFieldFinanceOperatorContext(t, r)
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
