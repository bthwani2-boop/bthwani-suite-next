package wlt

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCreatePaymentSessionOmitsDeprecatedFinancialScopeFromPayload(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var payload map[string]any
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payment-session request: %v", err)
		}
		if _, exists := payload["operatorContextId"]; exists {
			t.Fatalf("deprecated operatorContextId leaked into payment-session payload: %+v", payload)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": map[string]any{
				"id":               "ps-no-scope-payload",
				"checkoutIntentId": "intent-no-scope-payload",
				"status":           "reference_created",
			},
		})
	}))
	defer server.Close()

	client := NewClient(server.URL, "test-service-token")
	_, err := client.CreatePaymentSession(trustedMutationTestContext(), CreatePaymentSessionInput{
		CheckoutIntentID: "intent-no-scope-payload",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "official_wallet",
		AmountMinorUnits: 1000,
		Currency:         "YER",
		CartSnapshotHash: "snapshot-1",
		CorrelationID:    "corr-no-scope-payload",
		IdempotencyKey:   "idem-no-scope-payload",
	})
	if err != nil {
		t.Fatalf("CreatePaymentSession returned error: %v", err)
	}
}
