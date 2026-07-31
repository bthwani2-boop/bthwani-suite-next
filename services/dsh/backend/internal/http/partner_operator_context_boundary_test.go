package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/auth"
	"dsh-api/internal/partner"
)

func identitySessionServer(t *testing.T, identity auth.Identity) *httptest.Server {
	t.Helper()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/session" {
			http.NotFound(w, r)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(identity)
	}))
	t.Cleanup(server.Close)
	return server
}

func TestTrustedPartnerOperatorContextComesFromIdentity(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "OperatorContext-a")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-a",
		OperatorContextID:  "OperatorContext-a",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerOperatorContext(func(w http.ResponseWriter, r *http.Request) {
		called = true
		operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
		if !ok || operatorContextID != "OperatorContext-a" {
			t.Fatalf("trusted OperatorContext = %q, ok=%v", operatorContextID, ok)
		}
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners?operatorContextId=spoofed", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	req.Header.Set("X-Operator-Context-ID", "spoofed")
	res := httptest.NewRecorder()
	handler(res, req)

	if !called || res.Code != http.StatusNoContent {
		t.Fatalf("trusted OperatorContext boundary returned status=%d called=%v body=%s", res.Code, called, res.Body.String())
	}
}

func TestTrustedPartnerOperatorContextRejectsIdentityWithoutOperatorContext(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-without-OperatorContext",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerOperatorContext(func(http.ResponseWriter, *http.Request) { called = true })
	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	req.Header.Set("X-Operator-Context-ID", "spoofed-OperatorContext")
	res := httptest.NewRecorder()
	handler(res, req)

	if called {
		t.Fatal("request without Identity OperatorContext reached the protected handler")
	}
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status=%d want=%d body=%s", res.Code, http.StatusUnauthorized, res.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatal(err)
	}
	if body["code"] != "UNAUTHENTICATED" {
		t.Fatalf("code=%v want UNAUTHENTICATED", body["code"])
	}
}

func TestTrustedPartnerOperatorContextUsesIdentityOperatorContextInsteadOfProcessDefault(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "OperatorContext-a")
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:   "operator-b",
		OperatorContextID:  "OperatorContext-b",
		Roles:     []string{"operator"},
		AuthState: "authenticated",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil)

	called := false
	handler := protected.withTrustedPartnerOperatorContext(func(w http.ResponseWriter, r *http.Request) {
		called = true
		operatorContextID, ok := partner.OperatorContextIDFromContext(r.Context())
		if !ok || operatorContextID != "OperatorContext-b" {
			t.Fatalf("trusted OperatorContext = %q, ok=%v", operatorContextID, ok)
		}
		w.WriteHeader(http.StatusNoContent)
	})
	req := httptest.NewRequest(http.MethodGet, "/dsh/operator/partners", nil)
	req.Header.Set("Authorization", "Bearer test-session")
	res := httptest.NewRecorder()
	handler(res, req)

	if !called || res.Code != http.StatusNoContent {
		t.Fatalf("Identity OperatorContext boundary status=%d called=%v body=%s", res.Code, called, res.Body.String())
	}
}
