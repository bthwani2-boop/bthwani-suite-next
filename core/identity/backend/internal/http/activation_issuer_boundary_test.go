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

type fakeActorAccessLookup struct {
	accessByActor map[string]activationActorAccess
	errByActor    map[string]error
	lookedUp      []string
}

func (f *fakeActorAccessLookup) AccessForActor(_ context.Context, actorID string) (activationActorAccess, error) {
	f.lookedUp = append(f.lookedUp, actorID)
	if err := f.errByActor[actorID]; err != nil {
		return activationActorAccess{}, err
	}
	access, ok := f.accessByActor[actorID]
	if !ok {
		return activationActorAccess{}, sql.ErrNoRows
	}
	return access, nil
}

func issuerAccess(operatorContextID, action string) activationActorAccess {
	return activationActorAccess{
		OperatorContextID: operatorContextID,
		Active:   true,
		Permissions: []activationIssuerPermission{
			{Service: "workforce", Surface: "control-panel", Action: action, Scope: "all"},
		},
	}
}

func targetAccess(operatorContextID string) activationActorAccess {
	return activationActorAccess{OperatorContextID: operatorContextID, Active: false}
}

func TestActivationIssuerBoundaryAcceptsAuthorizedSameOperatorContextIssuerAndRestoresBody(t *testing.T) {
	configureIdentity(t)
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-1": issuerAccess("OperatorContext-main", "provider.activation:issue"),
		"field-1":    targetAccess("OperatorContext-main"),
	}}
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

	activationIssuerBoundary(lookup, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusCreated {
		t.Fatalf("expected forwarded request called=%v status=%d body=%s", nextCalled, response.Code, response.Body.String())
	}
	if forwardedBody != requestBody {
		t.Fatalf("request body was not restored: %q", forwardedBody)
	}
	if strings.Join(lookup.lookedUp, ",") != "operator-1,field-1" {
		t.Fatalf("unexpected actor lookups: %#v", lookup.lookedUp)
	}
}

func TestActivationIssuerBoundaryRejectsCrossOperatorContextIssuer(t *testing.T) {
	configureIdentity(t)
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-2": issuerAccess("OperatorContext-other", "provider.activation:issue"),
		"field-1":    targetAccess("OperatorContext-main"),
	}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-2","expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected OPERATOR_CONTEXT_FORBIDDEN, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsCrossOperatorContextIssuerOutsideActivePlatform(t *testing.T) {
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-2": issuerAccess("OperatorContext-other", "provider.activation:issue"),
		"field-1":    targetAccess("OperatorContext-main"),
	}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-2","expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "OPERATOR_CONTEXT_FORBIDDEN") {
		t.Fatalf("expected fail-closed OperatorContext rejection, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsInactiveIssuer(t *testing.T) {
	configureIdentity(t)
	inactiveIssuer := issuerAccess("OperatorContext-main", "provider.activation:issue")
	inactiveIssuer.Active = false
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-1": inactiveIssuer,
		"field-1":    targetAccess("OperatorContext-main"),
	}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-1","expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "issuing actor is not active") {
		t.Fatalf("expected inactive issuer rejection, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsIssuerWithoutRequiredPermission(t *testing.T) {
	configureIdentity(t)
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-1": issuerAccess("OperatorContext-main", "employee:read"),
		"field-1":    targetAccess("OperatorContext-main"),
	}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-1","expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "lacks activation permission") {
		t.Fatalf("expected permission rejection, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRequiresEmployeeActivationPermissionForEmployee(t *testing.T) {
	configureIdentity(t)
	lookup := &fakeActorAccessLookup{accessByActor: map[string]activationActorAccess{
		"operator-1": issuerAccess("OperatorContext-main", "provider.activation:issue"),
		"employee-1": targetAccess("OperatorContext-main"),
	}}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/employee-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-1","expectedActorType":"employee"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "lacks activation permission") {
		t.Fatalf("expected employee permission separation, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsSelfIssuance(t *testing.T) {
	configureIdentity(t)
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/operator-1/activations",
		strings.NewReader(`{"issuedByActorId":"operator-1","expectedActorType":"employee"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(&fakeActorAccessLookup{}, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusForbidden || !strings.Contains(response.Body.String(), "cannot issue its own activation") {
		t.Fatalf("expected self-issuance rejection, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryRejectsMissingIssuer(t *testing.T) {
	configureIdentity(t)
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(&fakeActorAccessLookup{}, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest || !strings.Contains(response.Body.String(), "INVALID_REQUEST") {
		t.Fatalf("expected INVALID_REQUEST, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryReturnsNotFoundForMissingIssuerActor(t *testing.T) {
	configureIdentity(t)
	lookup := &fakeActorAccessLookup{
		accessByActor: map[string]activationActorAccess{"field-1": targetAccess("OperatorContext-main")},
		errByActor:    map[string]error{"missing-operator": sql.ErrNoRows},
	}
	request := httptest.NewRequest(
		http.MethodPost,
		"/internal/actors/field-1/activations",
		strings.NewReader(`{"issuedByActorId":"missing-operator","expectedActorType":"field"}`),
	)
	response := httptest.NewRecorder()

	activationIssuerBoundary(lookup, http.NotFoundHandler()).ServeHTTP(response, request)

	if response.Code != http.StatusNotFound || !strings.Contains(response.Body.String(), "ACTOR_NOT_FOUND") {
		t.Fatalf("expected ACTOR_NOT_FOUND, got status=%d body=%s", response.Code, response.Body.String())
	}
}

func TestActivationIssuerBoundaryIgnoresRevokeRoute(t *testing.T) {
	configureIdentity(t)
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

	activationIssuerBoundary(&fakeActorAccessLookup{}, next).ServeHTTP(response, request)

	if !nextCalled || response.Code != http.StatusNoContent {
		t.Fatalf("expected revoke passthrough called=%v status=%d", nextCalled, response.Code)
	}
}
