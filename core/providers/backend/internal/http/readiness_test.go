package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"providers-api/internal/auth"
)

func TestProvidersReadinessFailsClosedWithoutDatabase(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/providers/readiness", nil)

	// Test the server's providerReadiness handler with nil database
	s := &server{db: nil}
	identity := auth.Identity{Subject: "test-actor", Roles: []string{"operator"}}
	s.providerReadiness(recorder, request, identity)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected readiness to fail closed with 503, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"reason":"database_unavailable"`) {
		t.Fatalf("unexpected readiness body: %s", recorder.Body.String())
	}
}