package http

import (
	"encoding/json"
	nethttp "net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/store"
	"github.com/lib/pq"
)

func TestAddressErrorMapsLogicalDuplicate(t *testing.T) {
	t.Parallel()

	response := httptest.NewRecorder()
	addressError(response, &pq.Error{
		Code:       pq.ErrorCode("23505"),
		Constraint: "uq_dsh_client_addresses_active_fingerprint",
	})

	if response.Code != nethttp.StatusConflict {
		t.Fatalf("status = %d, want %d", response.Code, nethttp.StatusConflict)
	}

	var payload store.ApiError
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if payload.Code != "ADDRESS_ALREADY_EXISTS" {
		t.Fatalf("code = %q, want ADDRESS_ALREADY_EXISTS", payload.Code)
	}
	if payload.Message == "" {
		t.Fatal("expected actionable duplicate-address message")
	}
}
