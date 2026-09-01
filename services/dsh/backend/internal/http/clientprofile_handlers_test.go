package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/auth"
)

func TestClientProfileConsentsMapsInvalidMutationToBadRequest(t *testing.T) {
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:           "client-profile-invalid-input",
		OperatorContextID: "client-profile-context",
		Roles:             []string{"client"},
		AuthState:         "authenticated",
		SessionSurface:    "app-client",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil, nil)
	request := httptest.NewRequest(
		http.MethodPatch,
		"/dsh/client/me/profile/consents",
		strings.NewReader(`{"marketingConsentEmail":true,"marketingConsentSms":false,"marketingConsentPush":true,"expectedVersion":-1}`),
	)
	request.Header.Set("Authorization", "Bearer test-session")
	request.Header.Set("Idempotency-Key", "client-profile-invalid-command")
	request.Header.Set("X-Correlation-ID", "client-profile-invalid-correlation")
	response := httptest.NewRecorder()

	protected.handleUpsertClientProfileConsents(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d body=%s", response.Code, http.StatusBadRequest, response.Body.String())
	}
	if !strings.Contains(response.Body.String(), `"code":"INVALID_INPUT"`) {
		t.Fatalf("expected INVALID_INPUT response, body=%s", response.Body.String())
	}
}

func TestClientProfilePreferencesRejectUnknownFields(t *testing.T) {
	identityServer := identitySessionServer(t, auth.Identity{
		Subject:           "client-profile-unknown-field",
		OperatorContextID: "client-profile-context",
		Roles:             []string{"client"},
		AuthState:         "authenticated",
		SessionSurface:    "app-client",
	})
	protected := newProtectedStoreServer(nil, auth.NewClient(identityServer.URL), nil, nil, nil)
	request := httptest.NewRequest(
		http.MethodPatch,
		"/dsh/client/me/profile/preferences",
		strings.NewReader(`{"locale":"ar","currencyPreference":"YER","unexpected":"reject-me"}`),
	)
	request.Header.Set("Authorization", "Bearer test-session")
	request.Header.Set("Idempotency-Key", "client-profile-unknown-command")
	request.Header.Set("X-Correlation-ID", "client-profile-unknown-correlation")
	response := httptest.NewRecorder()

	protected.handleUpsertClientProfilePreferences(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("status=%d want=%d body=%s", response.Code, http.StatusBadRequest, response.Body.String())
	}
}
