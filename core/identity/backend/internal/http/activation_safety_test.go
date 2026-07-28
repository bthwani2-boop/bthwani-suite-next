package http

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestActivationSafetyRejectsRetiredBootstrapCodeInEveryMode(t *testing.T) {
	for _, localBootstrap := range []string{"false", "true"} {
		t.Run("local-bootstrap-"+localBootstrap, func(t *testing.T) {
			t.Setenv("IDENTITY_LOCAL_BOOTSTRAP", localBootstrap)
			nextCalled := false
			handler := ActivationSafetyMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
				nextCalled = true
			}))
			request := httptest.NewRequest(http.MethodPost, "/auth/activate", strings.NewReader(`{"actorType":"field","phone":"+967700000001","code":"000000","deviceFingerprint":"device-1"}`))
			response := httptest.NewRecorder()

			handler.ServeHTTP(response, request)

			if response.Code != http.StatusUnauthorized {
				t.Fatalf("expected retired bootstrap code rejection, got %d", response.Code)
			}
			if nextCalled {
				t.Fatal("retired bootstrap code reached activation handler")
			}
		})
	}
}

func TestActivationSafetyRestoresValidActivationBody(t *testing.T) {
	nextCalled := false
	handler := ActivationSafetyMiddleware(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		body, err := io.ReadAll(r.Body)
		if err != nil {
			t.Fatal(err)
		}
		if !strings.Contains(string(body), `"code":"123456"`) {
			t.Fatalf("activation body was not restored: %s", string(body))
		}
		w.WriteHeader(http.StatusAccepted)
	}))
	request := httptest.NewRequest(http.MethodPost, "/auth/activate", strings.NewReader(`{"actorType":"field","phone":"+967700000001","code":"123456","deviceFingerprint":"device-1"}`))
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted || !nextCalled {
		t.Fatalf("valid activation request was not forwarded: status=%d called=%v", response.Code, nextCalled)
	}
}
