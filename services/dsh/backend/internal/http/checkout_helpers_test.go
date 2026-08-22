package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"dsh-api/internal/auth"
	"dsh-api/internal/checkout"
	"dsh-api/internal/wlt"
)

func TestMarshalIntentWithPricingPreservesReconciliationContract(t *testing.T) {
	now := time.Now().UTC()
	expiresAt := now.Add(time.Hour)
	intent := &checkout.Intent{
		ID: "intent-1", OperatorContextID: "operator-1", ClientID: "client-1", CartID: "cart-1", StoreID: "store-1",
		FulfillmentMode: checkout.ModeBthwaniDelivery, State: checkout.StateConfirming, PaymentMethod: checkout.MethodWallet,
		WltPaymentSessionID: "session-1", DeliveryAddress: "address-snapshot", Note: "leave at door", Version: 3,
		CreatedAt: now.Add(-time.Minute), UpdatedAt: now.Add(-10 * time.Second), ExpiresAt: &expiresAt,
		PreviewHash: "preview-hash", ValidationIssues: []checkout.ValidationIssue{{Code: "CHECK", Message: "checking", Field: "cart"}},
	}
	pricing := checkout.PricingSnapshot{
		SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, DiscountMinorUnits: 50, TotalMinorUnits: 1050,
		Currency: "YER", SnapshotHash: "pricing-hash", CouponID: "coupon-1", CouponRedemptionID: "redemption-1", CouponCodeLast4: "1234",
	}

	result := marshalIntentWithPricing(intent, pricing)
	for key, want := range map[string]any{
		"id": "intent-1", "operatorContextId": "operator-1", "state": "confirming", "paymentMethod": "wallet",
		"wltPaymentSessionId": "session-1", "subtotalMinorUnits": int64(1000), "deliveryFeeMinorUnits": int64(100),
		"discountMinorUnits": int64(50), "totalMinorUnits": int64(1050), "currency": "YER", "pricingSnapshotHash": "pricing-hash",
		"couponId": "coupon-1", "couponRedemptionId": "redemption-1", "couponCodeLast4": "1234", "reconciliationRequired": true,
	} {
		if result[key] != want {
			t.Fatalf("result[%q]=%#v, want %#v", key, result[key], want)
		}
	}
	if _, ok := result["expiresAt"]; !ok || result["expiresAt"] != &expiresAt {
		t.Fatalf("expiresAt was not preserved: %#v", result["expiresAt"])
	}
	if age, ok := result["reconciliationAgeSeconds"].(int64); !ok || age < 0 {
		t.Fatalf("invalid reconciliation age: %#v", result["reconciliationAgeSeconds"])
	}

	intent.State = checkout.StateConfirmed
	intent.ExpiresAt = nil
	result = marshalIntentWithPricing(intent, pricing)
	if result["reconciliationRequired"] != false || result["reconciliationAgeSeconds"] != int64(0) || result["expiresAt"] != nil {
		t.Fatalf("terminal intent reconciliation projection is wrong: %#v", result)
	}
}

func TestCheckoutFingerprintIsDeterministicAndTupleBound(t *testing.T) {
	first := checkoutCreateFingerprint("cart-1", "store-1", "wallet")
	if first == "" || len(first) != 64 || first != checkoutCreateFingerprint("cart-1", "store-1", "wallet") {
		t.Fatalf("fingerprint is not stable SHA-256 hex: %q", first)
	}
	if first == checkoutCreateFingerprint("cart-1", "store-1|wallet") || first == checkoutCreateFingerprint("cart-1", "store-1") {
		t.Fatal("fingerprint does not preserve tuple boundaries")
	}
}

func TestCheckoutQuoteMatchesPricingRejectsStaleOrMismatchedQuotes(t *testing.T) {
	intent := &checkout.Intent{ID: "intent-1"}
	pricing := checkout.PricingSnapshot{SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, DiscountMinorUnits: 50, TotalMinorUnits: 1050, Currency: "YER"}
	expires := time.Now().UTC().Add(time.Minute)
	valid := &wlt.WltPricingQuote{ID: "quote-1", ExpiresAt: &expires, SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, DiscountMinorUnits: 50, TotalMinorUnits: 1050, Currency: "YER"}
	if !checkoutQuoteMatchesPricing(valid, intent, pricing) {
		t.Fatal("matching live quote was rejected")
	}

	cases := []struct {
		name  string
		quote *wlt.WltPricingQuote
	}{
		{name: "nil quote", quote: nil},
		{name: "empty id", quote: &wlt.WltPricingQuote{ExpiresAt: &expires}},
		{name: "missing expiry", quote: &wlt.WltPricingQuote{ID: "quote-1"}},
		{name: "expired", quote: &wlt.WltPricingQuote{ID: "quote-1", ExpiresAt: ptrTime(time.Now().UTC().Add(-time.Minute))}},
		{name: "service fee", quote: &wlt.WltPricingQuote{ID: "quote-1", ExpiresAt: &expires, SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, ServiceFeeMinorUnits: 1, DiscountMinorUnits: 50, TotalMinorUnits: 1050, Currency: "YER"}},
		{name: "amount mismatch", quote: &wlt.WltPricingQuote{ID: "quote-1", ExpiresAt: &expires, SubtotalMinorUnits: 1001, DeliveryFeeMinorUnits: 100, DiscountMinorUnits: 50, TotalMinorUnits: 1051, Currency: "YER"}},
		{name: "currency mismatch", quote: &wlt.WltPricingQuote{ID: "quote-1", ExpiresAt: &expires, SubtotalMinorUnits: 1000, DeliveryFeeMinorUnits: 100, DiscountMinorUnits: 50, TotalMinorUnits: 1050, Currency: "USD"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if checkoutQuoteMatchesPricing(tc.quote, intent, pricing) {
				t.Fatal("invalid quote was accepted")
			}
		})
	}
}

func ptrTime(value time.Time) *time.Time { return &value }

func TestCreateCheckoutIntentRejectsInvalidRequestBeforeDatabaseAccess(t *testing.T) {
	tests := []struct {
		name        string
		body        string
		idempotency string
		wantStatus  int
	}{
		{name: "malformed json", body: "{", wantStatus: http.StatusBadRequest},
		{name: "unknown field", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1,"unknown":true}`, idempotency: "checkout-key-000001", wantStatus: http.StatusBadRequest},
		{name: "missing required checkout fields", body: `{}`, wantStatus: http.StatusBadRequest},
		{name: "missing idempotency key", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1}`, wantStatus: http.StatusBadRequest},
		{name: "invalid fulfillment mode", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1,"fulfillmentMode":"courier"}`, idempotency: "checkout-key-000001", wantStatus: http.StatusBadRequest},
		{name: "invalid payment method", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1,"paymentMethod":"credit_card"}`, idempotency: "checkout-key-000001", wantStatus: http.StatusBadRequest},
		{name: "cod pickup is forbidden", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1,"fulfillmentMode":"pickup","paymentMethod":"cod"}`, idempotency: "checkout-key-000001", wantStatus: http.StatusUnprocessableEntity},
		{name: "delivery address is required", body: `{"cartId":"cart-1","storeId":"store-1","expectedCartVersion":1}`, idempotency: "checkout-key-000001", wantStatus: http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			s := fakeIdentityServer(t, func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(http.StatusOK)
				_ = json.NewEncoder(w).Encode(auth.Identity{
					Subject:           "client-1",
					OperatorContextID: "operator-context-1",
					Roles:             []string{"client"},
					AuthState:         "authenticated",
					SessionSurface:    "app-client",
				})
			})
			request := httptest.NewRequest(http.MethodPost, "/dsh/client/checkout-intents", bytes.NewBufferString(tc.body))
			request.Header.Set("Authorization", "Bearer [REDACTED:Bearer token]")
			if tc.idempotency != "" {
				request.Header.Set("Idempotency-Key", tc.idempotency)
			}
			response := httptest.NewRecorder()

			s.handleCreateCheckoutIntent(response, request)

			if response.Code != tc.wantStatus {
				t.Fatalf("status=%d, want %d, body=%s", response.Code, tc.wantStatus, response.Body.String())
			}
		})
	}
}
