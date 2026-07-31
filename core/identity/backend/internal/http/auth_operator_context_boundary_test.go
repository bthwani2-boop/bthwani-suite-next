package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"identity-api/internal/identity"
)

type fakeAuthOperatorContextRepository struct {
	resolvedByToken map[string]identity.ActorIdentity
	resolveErr      error
	loggedOutTokens []string
}

func (f *fakeAuthOperatorContextRepository) ResolveAccessToken(
	_ context.Context,
	accessToken string,
) (identity.ActorIdentity, error) {
	if f.resolveErr != nil {
		return identity.ActorIdentity{}, f.resolveErr
	}
	return f.resolvedByToken[accessToken], nil
}

func (f *fakeAuthOperatorContextRepository) Logout(_ context.Context, accessToken string) error {
	f.loggedOutTokens = append(f.loggedOutTokens, accessToken)
	return nil
}

func TestAuthOperatorContextBoundaryPassesMatchingLoginSession(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-Correlation-ID", "corr-1")
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "access-1",
			"refreshToken": "refresh-1",
			"identity": map[string]any{"operatorContextId": "OperatorContext-main"},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), "access-1") {
		t.Fatalf("expected matching session response, status=%d body=%s", response.Code, response.Body.String())
	}
	if response.Header().Get("X-Correlation-ID") != "corr-1" {
		t.Fatalf("expected response headers to be preserved, got %#v", response.Header())
	}
	if len(repository.loggedOutTokens) != 0 {
		t.Fatalf("matching session was revoked: %#v", repository.loggedOutTokens)
	}
}

func TestAuthOperatorContextBoundaryRejectsAndRevokesCrossOperatorContextLogin(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "cross-token",
			"refreshToken": "refresh-1",
			"identity": map[string]any{"operatorContextId": "OperatorContext-other"},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
	if len(repository.loggedOutTokens) != 1 || repository.loggedOutTokens[0] != "cross-token" {
		t.Fatalf("expected cross-token revocation, got %#v", repository.loggedOutTokens)
	}
	if strings.Contains(response.Body.String(), "cross-token") {
		t.Fatal("cross-OperatorContext access token leaked to caller")
	}
}

func TestAuthOperatorContextBoundaryRejectsMissingOperatorContextAndRevokesToken(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "OperatorContextless-token",
			"refreshToken": "refresh-1",
			"identity": map[string]any{},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_REQUIRED") {
		t.Fatalf("expected OPERATOR_CONTEXT_REQUIRED, status=%d body=%s", response.Code, response.Body.String())
	}
	if len(repository.loggedOutTokens) != 1 || repository.loggedOutTokens[0] != "OperatorContextless-token" {
		t.Fatalf("expected OperatorContextless token revocation, got %#v", repository.loggedOutTokens)
	}
}

func TestAuthOperatorContextBoundaryRejectsCrossOperatorContextSessionProjection(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, identity.ActorIdentity{
			Subject: "actor-1", OperatorContextID: "OperatorContext-other", AuthState: "authenticated",
		})
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected session OperatorContext rejection, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthOperatorContextBoundaryPrechecksProtectedBearerRoutes(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{resolvedByToken: map[string]identity.ActorIdentity{
		"cross-token": {Subject: "actor-1", OperatorContextID: "OperatorContext-other", AuthState: "authenticated"},
	}}
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/sessions", nil)
	request.Header.Set("Authorization", "Bearer cross-token")
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, next).ServeHTTP(response, request)

	if nextCalled {
		t.Fatal("cross-OperatorContext protected request reached handler")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthOperatorContextBoundaryRejectsInvalidBearerBeforeHandler(t *testing.T) {
	configureIdentity(t)
	repository := &fakeAuthOperatorContextRepository{resolveErr: errors.New("invalid")}
	request := httptest.NewRequest(http.MethodPost, "/auth/password/change", strings.NewReader(`{}`))
	request.Header.Set("Authorization", "Bearer invalid-token")
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized || !strings.Contains(response.Body.String(), "UNAUTHENTICATED") {
		t.Fatalf("expected UNAUTHENTICATED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthOperatorContextBoundaryAllowsLogoutToRevokeStaleSession(t *testing.T) {
	configureIdentity(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	request.Header.Set("Authorization", "Bearer stale-token")
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(&fakeAuthOperatorContextRepository{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected logout passthrough called=%v status=%d", nextCalled, response.Code)
	}
}

func TestAuthOperatorContextBoundaryPassesThroughWhenDeferred(t *testing.T) {
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/sessions", nil)
	response := httptest.NewRecorder()

	AuthOperatorContextBoundary(&fakeAuthOperatorContextRepository{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected deferred passthrough called=%v status=%d", nextCalled, response.Code)
	}
}
