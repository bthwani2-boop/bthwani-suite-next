package http

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"identity-api/internal/identity"
)

type fakeGovernedRefreshRepository struct {
	pair        identity.TokenPair
	err         error
	seenToken   string
	seenDevice  string
}

func (f *fakeGovernedRefreshRepository) RefreshGovernedForDevice(
	_ context.Context,
	token string,
	deviceFingerprint string,
) (identity.TokenPair, error) {
	f.seenToken = token
	f.seenDevice = deviceFingerprint
	return f.pair, f.err
}

func refreshRequest(token string, deviceFingerprint ...string) *http.Request {
	body := map[string]string{"refreshToken": token}
	if len(deviceFingerprint) > 0 {
		body["deviceFingerprint"] = deviceFingerprint[0]
	}
	encoded, _ := json.Marshal(body)
	return httptest.NewRequest(http.MethodPost, "/auth/refresh", strings.NewReader(string(encoded)))
}

func decodeRefreshError(t *testing.T, recorder *httptest.ResponseRecorder) identity.ApiError {
	t.Helper()
	var body identity.ApiError
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode error response: %v", err)
	}
	return body
}

func TestGovernedRefreshBoundaryReturnsConflictWithoutMintingForConcurrentLoser(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: identity.ErrRefreshAlreadyRotated}
	nextCalled := false
	handler := GovernedRefreshBoundary(repository, http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.old-refresh", "device-1"))

	if recorder.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusConflict)
	}
	if nextCalled {
		t.Fatal("refresh request escaped governed boundary")
	}
	if repository.seenToken != "session.old-refresh" || repository.seenDevice != "device-1" {
		t.Fatalf("refresh boundary lost request binding: token=%q device=%q", repository.seenToken, repository.seenDevice)
	}
	body := decodeRefreshError(t, recorder)
	if body.Code != "REFRESH_ALREADY_ROTATED" {
		t.Fatalf("code = %q, want REFRESH_ALREADY_ROTATED", body.Code)
	}
}

func TestGovernedRefreshBoundaryRejectsMissingDeviceProof(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: identity.ErrDeviceFingerprintRequired}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.mobile"))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
	if body := decodeRefreshError(t, recorder); body.Code != "DEVICE_FINGERPRINT_REQUIRED" {
		t.Fatalf("code = %q, want DEVICE_FINGERPRINT_REQUIRED", body.Code)
	}
}

func TestGovernedRefreshBoundaryRejectsDeviceMismatch(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: identity.ErrDeviceFingerprintMismatch}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.mobile", "other-device"))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
	if body := decodeRefreshError(t, recorder); body.Code != "DEVICE_FINGERPRINT_MISMATCH" {
		t.Fatalf("code = %q, want DEVICE_FINGERPRINT_MISMATCH", body.Code)
	}
}

func TestGovernedRefreshBoundaryKeepsInvalidRefreshUnauthenticated(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: identity.ErrInvalidRefresh}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.invalid", "device-1"))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
	body := decodeRefreshError(t, recorder)
	if body.Code != "INVALID_REFRESH_TOKEN" {
		t.Fatalf("code = %q, want INVALID_REFRESH_TOKEN", body.Code)
	}
}

func TestGovernedRefreshBoundaryKeepsInfrastructureFailureRetryable(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: errors.New("database unavailable")}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.current", "device-1"))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusServiceUnavailable)
	}
	body := decodeRefreshError(t, recorder)
	if body.Code != "IDENTITY_UNAVAILABLE" {
		t.Fatalf("code = %q, want IDENTITY_UNAVAILABLE", body.Code)
	}
}

func TestGovernedRefreshBoundaryReturnsTokenPairForWinner(t *testing.T) {
	expiresAt := time.Now().UTC().Add(time.Minute)
	repository := &fakeGovernedRefreshRepository{pair: identity.TokenPair{
		AccessToken:  "access-new",
		RefreshToken: "refresh-new",
		AccessExpiry: expiresAt,
		Identity: identity.ActorIdentity{
			Subject:        "employee-1",
			Roles:          []string{"employee"},
			AuthState:      "authenticated",
			SessionID:      "session-1",
			SessionSurface: "control-panel",
			SurfaceAccess:  map[string]bool{"control-panel": true},
			ServiceAccess:  map[string]bool{"dsh": true},
			ExpiresAt:      expiresAt,
		},
	}}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.current"))

	if recorder.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d: %s", recorder.Code, http.StatusOK, recorder.Body.String())
	}
	var body map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode token response: %v", err)
	}
	if body["accessToken"] != "access-new" || body["refreshToken"] != "refresh-new" {
		t.Fatalf("unexpected token response: %#v", body)
	}
}

func TestGovernedRefreshBoundaryDelegatesNonRefreshTraffic(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: errors.New("must not be called")}
	handler := GovernedRefreshBoundary(repository, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/auth/session", nil))

	if recorder.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusNoContent)
	}
	if repository.seenToken != "" || repository.seenDevice != "" {
		t.Fatalf("governed refresh repository called for non-refresh request: token=%q device=%q", repository.seenToken, repository.seenDevice)
	}
}
