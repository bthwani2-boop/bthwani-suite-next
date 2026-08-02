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

	// RuntimeReadinessBoundary with nil store (no database) fails closed
	boundary := RuntimeReadinessBoundary(http.NotFoundHandler(), nil)
	boundary.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected readiness to fail closed with 503, got %d", recorder.Code)
	}
	if !strings.Contains(recorder.Body.String(), `"code":"PROVIDERS_NOT_READY"`) {
		t.Fatalf("unexpected readiness body: %s", recorder.Body.String())
	}
}
