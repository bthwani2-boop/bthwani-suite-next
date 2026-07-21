package http

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestActivationSafetyRejectsBootstrapCodeOutsideLocalMode(t *testing.T) {
	t.Setenv("IDENTITY_LOCAL_BOOTSTRAP", "false")
	nextCalled := false
	handler := ActivationSafetyMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(http.MethodPost, "/auth/activate", strings.NewReader(`{"actorType":"field","phone":"+967700000001","code":"000000","deviceFingerprint":"device-1"}`))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusUnauthorized {
		t.Fatalf("expected bootstrap code rejection, got %d", response.Code)
	}
	if nextCalled {
		t.Fatal("bootstrap code reached activation handler outside local mode")
	}
}

func TestActivationSafetyAllowsBootstrapCodeOnlyInExplicitLocalMode(t *testing.T) {
	t.Setenv("IDENTITY_LOCAL_BOOTSTRAP", "true")
	nextCalled := false
	handler := ActivationSafetyMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(body), `"code":"000000"`) {
			t.Fatalf("activation body was not restored: %s", string(body))
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	request := httptest.NewRequest(http.MethodPost, "/auth/activate", strings.NewReader(`{"actorType":"field","phone":"+967700000001","code":"000000","deviceFingerprint":"device-1"}`))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted || !nextCalled {
		t.Fatalf("explicit local bootstrap request was not forwarded: status=%d called=%v", response.Code, nextCalled)
	}
}
