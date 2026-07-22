package http

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestProvidersReadinessFailsClosedWithoutDatabase(t *testing.T) {
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/providers/readiness", nil)

	(&server{}).readiness(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected readiness to fail closed with 503, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"status":"not_ready"`) ||
		!strings.Contains(recorder.Body.String(), `"reason":"database_unavailable"`) {
		t.Fatalf("unexpected readiness body: %s", recorder.Body.String())
	}
}
