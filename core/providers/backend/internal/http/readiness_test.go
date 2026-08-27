package http

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"providers-api/internal/auth"
)

func TestProvidersReadinessIsPublicAndFailsClosedWithoutDatabase(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/providers/readiness", nil)

	NewRouter(nil, nil, nil, nil).ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected readiness to fail closed with 503, got %d", recorder.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode readiness response: %v", err)
	}
	if body["status"] != "NOT_READY" {
		t.Fatalf("expected NOT_READY status, got %q", body["status"])
	}
	if body["reason"] != "database_unavailable" {
		t.Fatalf("expected database_unavailable reason, got %q", body["reason"])
	}
}

func TestProvidersReadinessHandlerFailsClosedWithoutDatabase(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/providers/readiness", nil)

	s := &server{db: nil}
	identity := auth.Identity{Subject: "test-actor", Roles: []string{"operator"}}
	s.providerReadiness(recorder, request, identity)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected readiness to fail closed with 503, got %d", recorder.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(recorder.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode readiness response: %v", err)
	}
	if body["status"] != "NOT_READY" {
		t.Fatalf("expected NOT_READY status, got %q", body["status"])
	}
}
