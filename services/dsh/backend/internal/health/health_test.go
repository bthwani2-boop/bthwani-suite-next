package health

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHandleHealthReturnsHealthyStatus(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	HandleHealth(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected HTTP 200, got %d", rec.Code)
	}
	var resp HealthResponse
	if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Service != "dsh" {
		t.Fatalf("expected service=dsh, got %q", resp.Service)
	}
	if resp.Status != "healthy" {
		t.Fatalf("expected status=healthy, got %q", resp.Status)
	}
	if resp.CheckedAt == "" {
		t.Fatalf("expected checkedAt to be populated")
	}
}
