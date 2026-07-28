package http

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestReferenceReadBoundaryProtectsGetReferenceRoutesInEveryMode(t *testing.T) {
	for _, mode := range []string{"active", "deferred", ""} {
		t.Run(mode, func(t *testing.T) {
			t.Setenv("BTHWANI_SAAS_MODE", mode)
			t.Setenv("IDENTITY_API_BASE_URL", "")

			nextCalled := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				nextCalled = true
				w.WriteHeader(http.StatusNoContent)
			})

			protectedRequest := httptest.NewRequest(
				http.MethodGet,
				"/wlt/references/payment-status?orderId=order-1",
				nil,
			)
			protectedResponse := httptest.NewRecorder()
			ReferenceReadBoundary(next).ServeHTTP(protectedResponse, protectedRequest)
			if nextCalled {
				t.Fatal("unauthenticated reference read reached handler")
			}
			if protectedResponse.Code != http.StatusServiceUnavailable {
				t.Fatalf("expected fail-closed reference status, got %d", protectedResponse.Code)
			}
		})
	}
}

func TestReferenceReadBoundaryLeavesHealthAndNonGetRoutesUntouched(t *testing.T) {
	nextCalled := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		nextCalled = true
		w.WriteHeader(http.StatusNoContent)
	})

	healthRequest := httptest.NewRequest(http.MethodGet, "/wlt/health", nil)
	healthResponse := httptest.NewRecorder()
	ReferenceReadBoundary(next).ServeHTTP(healthResponse, healthRequest)
	if !nextCalled || healthResponse.Code != http.StatusNoContent {
		t.Fatalf("health route was captured called=%v status=%d", nextCalled, healthResponse.Code)
	}

	nextCalled = false
	postRequest := httptest.NewRequest(http.MethodPost, "/wlt/references/payment-status", nil)
	postResponse := httptest.NewRecorder()
	ReferenceReadBoundary(next).ServeHTTP(postResponse, postRequest)
	if !nextCalled || postResponse.Code != http.StatusNoContent {
		t.Fatalf("non-GET reference route was captured called=%v status=%d", nextCalled, postResponse.Code)
	}
}
