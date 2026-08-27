package http

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"dsh-api/internal/platformpolicies"
)

func TestWritePlatformPolicyErrorUnavailable(t *testing.T) {
	response := httptest.NewRecorder()
	writePlatformPolicyError(response, errors.Join(platformpolicies.ErrPolicyTruthUnavailable, errors.New("database timeout")))

	if response.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 for unavailable policy truth, got %d", response.Code)
	}
	if !strings.Contains(response.Body.String(), "POLICY_TRUTH_UNAVAILABLE") {
		t.Fatalf("response did not expose the canonical error code: %s", response.Body.String())
	}
}
