package wlt

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReserveCodCapacityDecodesCanonicalWltConflictEnvelope(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusConflict)
		_, _ = w.Write([]byte(`{"code":"INSUFFICIENT_COD_CAPACITY","message":"captain wallet capacity is exhausted"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	_, _, err := client.ReserveCodCapacity(
		trustedMutationTestContext(),
		"order-1", "checkout-1", "captain-1", 1800000, "YER", "corr-1", "idem-1",
	)
	if err == nil || !strings.Contains(err.Error(), "INSUFFICIENT_COD_CAPACITY") {
		t.Fatalf("expected canonical WLT conflict code in error, got %v", err)
	}
}
