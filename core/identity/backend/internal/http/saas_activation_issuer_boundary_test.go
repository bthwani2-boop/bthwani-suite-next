package http

import (
	"context"
	"database/sql"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type fakeActorTenantLookup struct {
	tenantByActor map[string]string
	err           error
	lastActorID   string
}

func (f *fakeActorTenantLookup) TenantForActor(_ context.Context, actorID string) (string, error) {
	f.lastActorID = actorID
	if f.err != nil {
		return "", f.err
	}
	return f.tenantByActor[actorID], nil
}

func TestActivationIssuerBoundaryAcceptsSameTenantAndRestoresBody(t *testing.T) {
	configureIdentityActiveSaaS(t)
	lookup := &fakeActorTenantLookup{tenantByActor: map[string]string{"operator-1": "tenant-main"}}
	var forwardedBody string
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatalf("read forwarded body: %v", err)
		}
		forwardedBody = string(body)
		w.WriteHeader(http.StatusCreated)
	})
	requestBody := `{"issuedByActorId":"operator-1","expectedActorType":"field","expectedSurface":"app-field"}`
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(requestBody),
	)
	response := httptest.NewRecorder()

	saasActivationIssuerBoundary(lookup, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusCreated {
		t.Fatalf("expected forwarded request called=%v status=%d body=%s", nextCalled, response.Code, response.Body.String())
	}
	if lookup.lastActorID != "operator-1" {
		t.Fatalf("expected operator-1 lookup, got %q", lookup.lastActorID)
	}
	if forwardedBody != requestBody {
		t.Fatalf("request body was not restored: %q", forwardedBody)
	}
}

func TestActivationIssuerBoundaryRejectsCrossTenantIssuer(t *testing.T) {
	configureIdentityActiveSaaS(t)
	lookup := &fakeActorTenantLookup{tenantByActor: map[string]string{"operator-2": "tenant-other"}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-2"}`),
	)
	response := httptest.NewRecorder()

	saasActivationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "TENANT_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected TENANT_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsMissingIssuer(t *testing.T) {
	configureIdentityActiveSaaS(t)
	lookup := &fakeActorTenantLookup{}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	saasActivationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("expected INVALID_REQUEST, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryReturnsNotFoundForMissingIssuerActor(t *testing.T) {
	configureIdentityActiveSaaS(t)
	lookup := &fakeActorTenantLookup{err: sql.ErrNoRows}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"missing-operator"}`),
	)
	response := httptest.NewRecorder()

	saasActivationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "ACTOR_NOT_FOUND") {
		t.Fatalf("expected ACTOR_NOT_FOUND, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryIgnoresRevokeRoute(t *testing.T) {
	configureIdentityActiveSaaS(t)
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations/revoke",
		nil,
	)
	response := httptest.NewRecorder()

	saasActivationIssuerBoundary(&fakeActorTenantLookup{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected revoke passthrough called=%v status=%d", nextCalled, response.Code)
	}
}
