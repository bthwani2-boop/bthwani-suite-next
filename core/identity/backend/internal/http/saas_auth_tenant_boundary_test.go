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

type fakeAuthTenantRepository struct {
	resolvedByToken map[string]identity.ActorIdentity
	resolveErr      error
	loggedOutTokens []string
}

func (f *fakeAuthTenantRepository) ResolveAccessToken(
	_ context.Context,
	accessToken string,
) (identity.ActorIdentity, error) {
	if f.resolveErr != nil {
		return identity.ActorIdentity{}, f.resolveErr
	}
	return f.resolvedByToken[accessToken], nil
}

func (f *fakeAuthTenantRepository) Logout(_ context.Context, accessToken string) error {
	f.loggedOutTokens = append(f.loggedOutTokens, accessToken)
	return nil
}

func TestAuthTenantBoundaryPassesMatchingLoginSession(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("X-Correlation-ID", "corr-1")
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "access-1",
			"refreshToken": "refresh-1",
			"identity": map[string]any{"tenantId": "tenant-main"},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, next).ServeHTTP(response, request)

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

func TestAuthTenantBoundaryRejectsAndRevokesCrossTenantLogin(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "cross-token",
			"refreshToken": "refresh-1",
			"identity": map[string]any{"tenantId": "tenant-other"},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
	if len(repository.loggedOutTokens) != 1 || repository.loggedOutTokens[0] != "cross-token" {
		t.Fatalf("expected cross-token revocation, got %#v", repository.loggedOutTokens)
	}
	if strings.Contains(response.Body.String(), "cross-token") {
		t.Fatal("cross-tenant access token leaked to caller")
	}
}

func TestAuthTenantBoundaryRejectsMissingTenantAndRevokesToken(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, map[string]any{
			"accessToken": "tenantless-token",
			"refreshToken": "refresh-1",
			"identity": map[string]any{},
		})
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader(`{}`))
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_REQUIRED") {
		t.Fatalf("expected TENANT_CONTEXT_REQUIRED, status=%d body=%s", response.Code, response.Body.String())
	}
	if len(repository.loggedOutTokens) != 1 || repository.loggedOutTokens[0] != "tenantless-token" {
		t.Fatalf("expected tenantless token revocation, got %#v", repository.loggedOutTokens)
	}
}

func TestAuthTenantBoundaryRejectsCrossTenantSessionProjection(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{}
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		sendJSON(w, http.StatusOK, identity.ActorIdentity{
			Subject: "actor-1", TenantID: "tenant-other", AuthState: "authenticated",
		})
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/session", nil)
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, next).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected session tenant rejection, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthTenantBoundaryPrechecksProtectedBearerRoutes(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{resolvedByToken: map[string]identity.ActorIdentity{
		"cross-token": {Subject: "actor-1", TenantID: "tenant-other", AuthState: "authenticated"},
	}}
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/sessions", nil)
	request.Header.Set("Authorization", "Bearer cross-token")
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, next).ServeHTTP(response, request)

	if nextCalled {
		t.Fatal("cross-tenant protected request reached handler")
	}
	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthTenantBoundaryRejectsInvalidBearerBeforeHandler(t *testing.T) {
	configureIdentityActiveSaaS(t)
	repository := &fakeAuthTenantRepository{resolveErr: errors.New("invalid")}
	request := httptest.NewRequest(http.MethodPost, "/auth/password/change", strings.NewReader(`{}`))
	request.Header.Set("Authorization", "Bearer invalid-token")
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(repository, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized || !strings.Contains(response.Body.String(), "UNAUTHENTICATED") {
		t.Fatalf("expected UNAUTHENTICATED, status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestAuthTenantBoundaryAllowsLogoutToRevokeStaleSession(t *testing.T) {
	configureIdentityActiveSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodPost, "/auth/logout", nil)
	request.Header.Set("Authorization", "Bearer stale-token")
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(&fakeAuthTenantRepository{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected logout passthrough called=%v status=%d", nextCalled, response.Code)
	}
}

func TestAuthTenantBoundaryPassesThroughWhenDeferred(t *testing.T) {
	t.Setenv("BTHWANI_SAAS_MODE", "deferred")
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(http.MethodGet, "/auth/sessions", nil)
	response := httptest.NewRecorder()

	SaaSAuthTenantBoundary(&fakeAuthTenantRepository{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected deferred passthrough called=%v status=%d", nextCalled, response.Code)
	}
}
