package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func trustedMutationTestContext() context.Context {
	return WithOperatorContext(context.Background(), "OperatorContext-a")
}

func requireMutationHeaders(t *testing.T, r *http.Request) {
	t.Helper()
	if strings.TrimSpace(r.Header.Get("X-Correlation-ID")) == "" {
		t.Fatal("missing X-Correlation-ID")
	}
	if strings.TrimSpace(r.Header.Get("Idempotency-Key")) == "" {
		t.Fatal("missing Idempotency-Key")
	}
	if r.Header.Get("X-Delegated-Operator-Context") != "OperatorContext-a" {
		t.Fatalf("unexpected X-Delegated-Operator-Context %q", r.Header.Get("X-Delegated-Operator-Context"))
	}
	if got := r.Header.Get("X-Operator-Context-ID"); got != "" {
		t.Fatalf("legacy X-Operator-Context-ID must not be emitted, got %q", got)
	}
}

func TestDeterministicMutationKeyIsStableAndScoped(t *testing.T) {
	first := deterministicMutationKey("cod", "order-1")
	second := deterministicMutationKey("cod", "order-1")
	other := deterministicMutationKey("cod", "order-2")
	if first != second {
		t.Fatalf("expected stable key, got %q and %q", first, second)
	}
	if first == other {
		t.Fatalf("expected distinct keys for distinct business identities")
	}
	if !strings.HasPrefix(first, "dsh:cod:") {
		t.Fatalf("expected scoped key, got %q", first)
	}
}

func TestRequiredMutationHeadersRejectMissingValues(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "http://wlt.test/wlt/mutation", nil)
	if err := setRequiredMutationHeaders(req, "", "idem"); err == nil {
		t.Fatal("expected missing correlation id to fail")
	}
	if err := setRequiredMutationHeaders(req, "corr", ""); err == nil {
		t.Fatal("expected missing idempotency key to fail")
	}
}

func TestFinalizeCodReservationAddsDeterministicHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		if r.Header.Get("X-Correlation-ID") != "order-1" {
			t.Fatalf("unexpected correlation id %q", r.Header.Get("X-Correlation-ID"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"codReservation":{"id":"reservation-1","status":"finalized"},"replayed":false}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if _, _, err := client.FinalizeCodReservation(trustedMutationTestContext(), "order-1", "checkout-1", "", ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDeliverFieldCommissionUsesSameBodyAndHeaderIdempotencyKey(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		var body DeliverFieldCommissionInput
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			t.Fatalf("decode body: %v", err)
		}
		if body.IdempotencyKey != r.Header.Get("Idempotency-Key") {
			t.Fatalf("body/header idempotency mismatch: %q != %q", body.IdempotencyKey, r.Header.Get("Idempotency-Key"))
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if err := client.DeliverFieldCommission(trustedMutationTestContext(), DeliverFieldCommissionInput{
		BeneficiaryActorID: "field-1",
		VisitID:            "visit-1",
		SourceID:           "visit-1",
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestSettlementMutationAddsRequiredHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"settlement":{"id":"st-1"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if _, _, err := client.ExecuteFinanceWrite(trustedMutationTestContext(), "finance.settlements.create", nil, []byte(`{}`), "order-1", "idem-settlement-1", "OperatorContext-a", ""); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestCommercialProductWriteAddsRequiredHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"product": map[string]any{"reference": "plus"}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	product, err := client.CreateCommercialProduct(trustedMutationTestContext(), CreateCommercialProductInput{Reference: "plus"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.Reference != "plus" {
		t.Fatalf("unexpected product: %+v", product)
	}
}

func TestPromotionFundingRejectsMissingOperatorContextBeforeNetwork(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	_, err := client.ReservePromotionFunding(context.Background(), ReservePromotionFundingInput{
		CheckoutIntentID:   "checkout-1",
		ExternalReference:  "coupon-1",
		CouponRedemptionID: "redemption-1",
	}, "", "")
	if err == nil {
		t.Fatal("expected missing OperatorContext to fail")
	}
	if called {
		t.Fatal("promotion funding request reached network without OperatorContext")
	}
}

func TestSubscriptionPaymentSessionAddsFallbackHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{"paymentSession": map[string]any{"id": "ps-1"}})
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	session, err := client.CreateSubscriptionPaymentSession(trustedMutationTestContext(), CreateSubscriptionPaymentSessionInput{
		SubscriptionPurchaseID: "purchase-1",
		ProductReference:       "plus",
		ClientID:               "client-1",
		PaymentMethod:          "official_wallet",
	}, "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "ps-1" {
		t.Fatalf("unexpected session: %+v", session)
	}
}
