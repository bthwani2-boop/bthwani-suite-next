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
	pair identity.TokenPair
	err  error
	seen string
}

func (f *fakeGovernedRefreshRepository) RefreshGoverned(_ context.Context, token string) (identity.TokenPair, error) {
	f.seen = token
	return f.pair, f.err
}

func refreshRequest(token string) *http.Request {
	return httptest.NewRequest(
		http.MethodPost,
		"/auth/refresh",
		strings.NewReader(`{"refreshToken":"`+token+`"}`),
	)
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
	handler.ServeHTTP(recorder, refreshRequest("session.old-refresh"))

	if recorder.Code != http.StatusConflict {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusConflict)
	}
	if nextCalled {
		t.Fatal("refresh request escaped governed boundary")
	}
	if repository.seen != "session.old-refresh" {
		t.Fatalf("refresh token = %q", repository.seen)
	}
	body := decodeRefreshError(t, recorder)
	if body.Code != "REFRESH_ALREADY_ROTATED" {
		t.Fatalf("code = %q, want REFRESH_ALREADY_ROTATED", body.Code)
	}
}

func TestGovernedRefreshBoundaryKeepsInvalidRefreshUnauthenticated(t *testing.T) {
	repository := &fakeGovernedRefreshRepository{err: identity.ErrInvalidRefresh}
	handler := GovernedRefreshBoundary(repository, http.NotFoundHandler())

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, refreshRequest("session.invalid"))

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", recorder.Code, http.StatusUnauthorized)
	}
	body := decodeRefreshError(t, recorder)
	if body.Code != "INVALID_REFRESH_TOKEN" {
		t.Fatalf("code = %q, want INVALID_REFRESH_TOKEN", body.Code)
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
	if repository.seen != "" {
		t.Fatalf("governed refresh repository called for non-refresh request: %q", repository.seen)
	}
}
