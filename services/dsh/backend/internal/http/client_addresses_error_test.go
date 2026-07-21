package http

import (
	"encoding/json"
	nethttp "net/http"
	"net/http/httptest"
	"testing"

	"dsh-api/internal/clientaddress"
	"dsh-api/internal/store"
	"github.com/lib/pq"
)

func decodeAddressAPIError(t *testing.T, response *httptest.ResponseRecorder) store.ApiError {
	t.Helper()
	var payload store.ApiError
	if err := json.NewDecoder(response.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	return payload
}

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
	payload := decodeAddressAPIError(t, response)
	if payload.Code != "ADDRESS_ALREADY_EXISTS" {
		t.Fatalf("code = %q, want ADDRESS_ALREADY_EXISTS", payload.Code)
	}
	if payload.Message == "" {
		t.Fatal("expected actionable duplicate-address message")
	}
}

func TestAddressErrorMapsMutationIdempotencyConflict(t *testing.T) {
	t.Parallel()

	response := httptest.NewRecorder()
	addressError(response, clientaddress.ErrMutationIdempotencyConflict)

	if response.Code != nethttp.StatusConflict {
		t.Fatalf("status = %d, want %d", response.Code, nethttp.StatusConflict)
	}
	payload := decodeAddressAPIError(t, response)
	if payload.Code != "IDEMPOTENCY_CONFLICT" {
		t.Fatalf("code = %q, want IDEMPOTENCY_CONFLICT", payload.Code)
	}
}

func TestAddressMutationContextRequiresBoundedIdempotencyKey(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(nethttp.MethodPatch, "/dsh/client/addresses/addr-1", nil)
	request.Header.Set("Idempotency-Key", "short")
	response := httptest.NewRecorder()

	if _, ok := addressMutationContext(response, request); ok {
		t.Fatal("expected short idempotency key to be rejected")
	}
	if response.Code != nethttp.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, nethttp.StatusBadRequest)
	}
}

func TestAddressExpectedVersionRequiresPositiveHeader(t *testing.T) {
	t.Parallel()

	request := httptest.NewRequest(nethttp.MethodPost, "/dsh/client/addresses/addr-1/default", nil)
	request.Header.Set("If-Match-Version", "0")
	response := httptest.NewRecorder()

	if _, ok := addressExpectedVersion(response, request); ok {
		t.Fatal("expected non-positive version to be rejected")
	}
	if response.Code != nethttp.StatusBadRequest {
		t.Fatalf("status = %d, want %d", response.Code, nethttp.StatusBadRequest)
	}
}
