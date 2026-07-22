package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestActivationMutationSafetyRequiresStableRetryKey(t *testing.T) {
	nextCalled := false
	handler := ActivationMutationSafetyMiddleware(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		nextCalled = true
	}))
	request := httptest.NewRequest(http.MethodPost, "/workforce/field-agents/field-1/activation-codes", nil)
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusBadRequest {
		t.Fatalf("expected missing idempotency key rejection, got %d", response.Code)
	}
	if nextCalled {
		t.Fatal("activation issuance reached handler without retry identity")
	}
}

func TestActivationMutationSafetyAllowsGovernedRetryKey(t *testing.T) {
	nextCalled := false
	handler := ActivationMutationSafetyMiddleware(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusAccepted)
	}))
	request := httptest.NewRequest(http.MethodPost, "/workforce/captains/captain-1/activation-codes", nil)
	request.Header.Set("Idempotency-Key", "activation-captain-1-v3")
	response := httptest.NewRecorder()

	handler.ServeHTTP(response, request)

	if response.Code != http.StatusAccepted || !nextCalled {
		t.Fatalf("governed activation issuance was not forwarded: status=%d called=%v", response.Code, nextCalled)
	}
}
