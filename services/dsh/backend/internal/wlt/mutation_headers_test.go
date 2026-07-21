package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func requireMutationHeaders(t *testing.T, r *http.Request) {
	t.Helper()
	if strings.TrimSpace(r.Header.Get("X-Correlation-ID")) == "" {
		t.Fatal("missing X-Correlation-ID")
	}
	if strings.TrimSpace(r.Header.Get("Idempotency-Key")) == "" {
		t.Fatal("missing Idempotency-Key")
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

func TestNotifyDeliveryCollectionAddsDeterministicHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		if r.Header.Get("X-Correlation-ID") != "order-1" {
			t.Fatalf("unexpected correlation id %q", r.Header.Get("X-Correlation-ID"))
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if err := client.NotifyDeliveryCollection(context.Background(), NotifyDeliveryCollectionInput{
		OrderID:          "order-1",
		CollectorType:    "captain",
		CollectorID:      "captain-1",
		PartnerID:        "partner-1",
		CheckoutIntentID: "checkout-1",
	}); err != nil {
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
	if err := client.DeliverFieldCommission(context.Background(), DeliverFieldCommissionInput{
		BeneficiaryActorID: "field-1",
		VisitID:            "visit-1",
		SourceID:           "visit-1",
	}); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestActorFinanceMutationRejectsMissingCorrelation(t *testing.T) {
	called := false
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if _, _, err := client.FinanceWriteCodRecord(context.Background(), "cod-1", "collect", ""); err == nil {
		t.Fatal("expected missing correlation to fail")
	}
	if called {
		t.Fatal("mutation reached network without required correlation")
	}
}

func TestSettlementMutationAddsRequiredHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"settlement":{"id":"st-1"}}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "token")
	if _, _, err := client.FinanceWriteSettlement(context.Background(), http.MethodPost, "/wlt/settlements", []byte(`{}`), "order-1"); err != nil {
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
	product, err := client.CreateCommercialProduct(context.Background(), CreateCommercialProductInput{Reference: "plus"})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if product.Reference != "plus" {
		t.Fatalf("unexpected product: %+v", product)
	}
}

func TestPromotionFundingRejectsMissingTenantBeforeNetwork(t *testing.T) {
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
		t.Fatal("expected missing tenant to fail")
	}
	if called {
		t.Fatal("promotion funding request reached network without tenant")
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
	session, err := client.CreateSubscriptionPaymentSession(context.Background(), CreateSubscriptionPaymentSessionInput{
		SubscriptionPurchaseID: "purchase-1",
		ProductReference:       "plus",
		ClientID:               "client-1",
	}, "", "")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "ps-1" {
		t.Fatalf("unexpected session: %+v", session)
	}
}
