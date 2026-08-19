package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"workforce-api/internal/auth"
	"workforce-api/internal/dshclient"
)

type providerMediaVerifierFunc func(context.Context, string, string, string) error

func (f providerMediaVerifierFunc) ValidateProviderDocumentMedia(ctx context.Context, actorID, actorRole, mediaRef string) error {
	return f(ctx, actorID, actorRole, mediaRef)
}

func workforceIdentityServer(t *testing.T) *httptest.Server {
	t.Helper()
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/auth/session" {
			t.Fatalf("unexpected identity path %q", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"subject":           "operator-1",
			"operatorContextId": "context-1",
			"authState":         "authenticated",
			"roles":             []string{"operator"},
			"permissions":       []map[string]string{{"service": "workforce", "action": "provider:update", "scope": "all"}},
		})
	}))
}

func TestDocumentLinkRejectsMediaReferenceBeforeWorkforceWrite(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "context-1")
	identityServer := workforceIdentityServer(t)
	defer identityServer.Close()

	var verified struct{ actorID, actorRole, mediaRef string }
	verifier := providerMediaVerifierFunc(func(_ context.Context, actorID, actorRole, mediaRef string) error {
		verified = struct{ actorID, actorRole, mediaRef string }{actorID, actorRole, mediaRef}
		return dshclient.ErrProviderMediaInvalid
	})
	handler := ReferenceMutationMiddleware(http.NotFoundHandler(), nil, newAuthClient(identityServer.URL), verifier)
	req := httptest.NewRequest(http.MethodPost, "/workforce/field-agents/field-1/documents", jsonBody(t, map[string]any{"expectedVersion": 1, "mediaRef": "media-other"}))
	req.Header.Set("Authorization", "Bearer session-token")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)

	if recorder.Code != http.StatusBadRequest {
		t.Fatalf("expected invalid reference response 400, got %d", recorder.Code)
	}
	if verified.actorID != "field-1" || verified.actorRole != "field" || verified.mediaRef != "media-other" {
		t.Fatalf("unexpected verifier input: %#v", verified)
	}
}

func TestDocumentLinkFailsClosedWhenMediaAuthorityIsUnavailable(t *testing.T) {
	t.Setenv("BTHWANI_OPERATOR_CONTEXT_ID", "context-1")
	identityServer := workforceIdentityServer(t)
	defer identityServer.Close()
	handler := ReferenceMutationMiddleware(http.NotFoundHandler(), nil, newAuthClient(identityServer.URL), nil)
	req := httptest.NewRequest(http.MethodPost, "/workforce/captains/captain-1/documents", jsonBody(t, map[string]any{"expectedVersion": 1, "mediaRef": "media-1"}))
	req.Header.Set("Authorization", "Bearer session-token")
	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected media authority outage response 503, got %d", recorder.Code)
	}
}

func newAuthClient(baseURL string) *auth.Client { return auth.NewClient(baseURL) }

func jsonBody(t *testing.T, value any) *strings.Reader {
	t.Helper()
	encoded, err := json.Marshal(value)
	if err != nil {
		t.Fatal(err)
	}
	return strings.NewReader(string(encoded))
}
