package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

// TestCreatePaymentSessionReplayCarriesSameIdempotencyKey verifies that
// calling CreatePaymentSession twice with the same CheckoutIntentID (and no
// explicit IdempotencyKey/CorrelationID) derives the same idempotency key and
// correlation id both times, so a client-side replay after an ambiguous
// response is safe to retry against WLT.
func TestCreatePaymentSessionReplayCarriesSameIdempotencyKey(t *testing.T) {
	var idempotencyKeys []string
	var correlationIDs []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idempotencyKeys = append(idempotencyKeys, r.Header.Get("Idempotency-Key"))
		correlationIDs = append(correlationIDs, r.Header.Get("X-Correlation-ID"))
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	input := CreatePaymentSessionInput{
		CheckoutIntentID: "intent-replay-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
	}

	if _, err := c.CreatePaymentSession(context.Background(), input); err == nil {
		t.Fatal("expected first call to fail with HTTP 500")
	}
	if _, err := c.CreatePaymentSession(context.Background(), input); err == nil {
		t.Fatal("expected second call to fail with HTTP 500")
	}

	if len(idempotencyKeys) != 2 || len(correlationIDs) != 2 {
		t.Fatalf("expected 2 recorded requests, got %d idempotency keys and %d correlation ids", len(idempotencyKeys), len(correlationIDs))
	}
	if idempotencyKeys[0] == "" {
		t.Fatal("expected non-empty idempotency key")
	}
	if correlationIDs[0] == "" {
		t.Fatal("expected non-empty correlation id")
	}
	if idempotencyKeys[0] != idempotencyKeys[1] {
		t.Fatalf("expected replay to carry the same idempotency key, got %q and %q", idempotencyKeys[0], idempotencyKeys[1])
	}
	if correlationIDs[0] != correlationIDs[1] {
		t.Fatalf("expected replay to carry the same correlation id, got %q and %q", correlationIDs[0], correlationIDs[1])
	}
}

// TestCreatePaymentSessionTimeoutThenRetryUsesSameDeterministicKey verifies
// that when a WLT call times out client-side, the caller can safely retry:
// the idempotency key is derived purely from the input (not time or
// randomness), so the retry after a timeout carries the exact same key that
// WLT already saw on the timed-out attempt.
func TestCreatePaymentSessionTimeoutThenRetryUsesSameDeterministicKey(t *testing.T) {
	blockingReceived := make(chan struct{})
	var blockingKey string
	blockingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		blockingKey = r.Header.Get("Idempotency-Key")
		close(blockingReceived)
		// Sleep past the client's context deadline so the client observes a
		// timeout, while still returning so the connection closes cleanly
		// and the test server can shut down without hanging.
		time.Sleep(300 * time.Millisecond)
		w.WriteHeader(http.StatusOK)
	}))
	defer blockingServer.Close()

	c := NewClient(blockingServer.URL, "test-service-token")
	input := CreatePaymentSessionInput{
		CheckoutIntentID: "intent-timeout-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
	}

	timeoutCtx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	_, err := c.CreatePaymentSession(timeoutCtx, input)
	if err == nil {
		t.Fatal("expected timeout error")
	}
	if !strings.Contains(err.Error(), "context deadline exceeded") {
		t.Fatalf("expected context deadline exceeded error, got: %v", err)
	}

	select {
	case <-blockingReceived:
	default:
		t.Fatal("expected blocking server to have received the request before timing out")
	}
	if blockingKey == "" {
		t.Fatal("expected blocking server to record a non-empty idempotency key before blocking")
	}

	var retryKey string
	recordingServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		retryKey = r.Header.Get("Idempotency-Key")
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"paymentSession":{"id":"ps-retry-1"}}`))
	}))
	defer recordingServer.Close()

	retryClient := NewClient(recordingServer.URL, "test-service-token")
	if _, err := retryClient.CreatePaymentSession(context.Background(), input); err != nil {
		t.Fatalf("unexpected error on retry: %v", err)
	}
	if retryKey == "" {
		t.Fatal("expected non-empty idempotency key on retry")
	}
	if retryKey != blockingKey {
		t.Fatalf("expected retry to carry the same idempotency key as the timed-out attempt, got %q and %q", blockingKey, retryKey)
	}
}

// TestOutOfOrderMutationsCarryIndependentDeterministicKeys verifies that when
// two different mutations for the same underlying payment session arrive
// out of order (e.g. ExpireSession followed by a late-arriving
// NotifyDeliveryCollection for the related order), each mutation carries its
// own independent, non-empty, deterministic idempotency key and correlation
// id — there is no cross-mutation key collision that could let one mutation
// be mistaken for a replay of the other.
func TestOutOfOrderMutationsCarryIndependentDeterministicKeys(t *testing.T) {
	type recorded struct {
		path           string
		idempotencyKey string
		correlationID  string
	}
	var calls []recorded
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		calls = append(calls, recorded{
			path:           r.URL.Path,
			idempotencyKey: r.Header.Get("Idempotency-Key"),
			correlationID:  r.Header.Get("X-Correlation-ID"),
		})
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")

	paymentSessionID := "ps-ooo-1"
	orderID := "order-ooo-1"
	checkoutIntentID := "intent-ooo-1"

	// ExpireSession fires first (session was cancelled before any order).
	if err := c.ExpireSession(context.Background(), paymentSessionID, ""); err != nil {
		t.Fatalf("unexpected ExpireSession error: %v", err)
	}
	// NotifyDeliveryCollection arrives late, out of order, for the related order.
	if err := c.NotifyDeliveryCollection(context.Background(), NotifyDeliveryCollectionInput{
		OrderID:          orderID,
		CollectorType:    "captain",
		CollectorID:      "captain-ooo-1",
		PartnerID:        "partner-ooo-1",
		CheckoutIntentID: checkoutIntentID,
	}); err != nil {
		t.Fatalf("unexpected NotifyDeliveryCollection error: %v", err)
	}

	if len(calls) != 2 {
		t.Fatalf("expected 2 recorded calls, got %d", len(calls))
	}
	expireCall, notifyCall := calls[0], calls[1]

	if expireCall.idempotencyKey == "" || notifyCall.idempotencyKey == "" {
		t.Fatalf("expected non-empty idempotency keys, got %q and %q", expireCall.idempotencyKey, notifyCall.idempotencyKey)
	}
	if expireCall.correlationID == "" || notifyCall.correlationID == "" {
		t.Fatalf("expected non-empty correlation ids, got %q and %q", expireCall.correlationID, notifyCall.correlationID)
	}
	if expireCall.idempotencyKey == notifyCall.idempotencyKey {
		t.Fatalf("expected independent idempotency keys for distinct mutations, got the same key %q for both", expireCall.idempotencyKey)
	}
}

// TestNotifyDeliveryCollectionPartialFailureRetryCarriesSameKey verifies that
// after a server-side partial failure (HTTP 500), a caller-driven retry of
// the identical NotifyDeliveryCollection input is both safe (identical
// idempotency key on retry) and eventually succeeds.
func TestNotifyDeliveryCollectionPartialFailureRetryCarriesSameKey(t *testing.T) {
	var attempt int
	var idempotencyKeys []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempt++
		idempotencyKeys = append(idempotencyKeys, r.Header.Get("Idempotency-Key"))
		if attempt == 1 {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	input := NotifyDeliveryCollectionInput{
		OrderID:          "order-partial-1",
		CollectorType:    "captain",
		CollectorID:      "captain-partial-1",
		PartnerID:        "partner-partial-1",
		CheckoutIntentID: "intent-partial-1",
	}

	firstErr := c.NotifyDeliveryCollection(context.Background(), input)
	if firstErr == nil {
		t.Fatal("expected first attempt to fail with HTTP 500")
	}
	if !strings.Contains(firstErr.Error(), "500") {
		t.Fatalf("expected error to mention status 500, got: %v", firstErr)
	}

	secondErr := c.NotifyDeliveryCollection(context.Background(), input)
	if secondErr != nil {
		t.Fatalf("expected retry to succeed, got error: %v", secondErr)
	}

	if len(idempotencyKeys) != 2 {
		t.Fatalf("expected 2 recorded attempts, got %d", len(idempotencyKeys))
	}
	if idempotencyKeys[0] == "" {
		t.Fatal("expected non-empty idempotency key on first attempt")
	}
	if idempotencyKeys[0] != idempotencyKeys[1] {
		t.Fatalf("expected retry after partial failure to carry the same idempotency key, got %q and %q", idempotencyKeys[0], idempotencyKeys[1])
	}
}

// TestCommercialProductCreateHasDeterministicRequiredHeaders covers the
// commercial.go mutation surface: CreateCommercialProduct must always send
// non-empty required mutation headers, and two identical calls must derive
// the identical idempotency key so a replay is safe.
func TestCommercialProductCreateHasDeterministicRequiredHeaders(t *testing.T) {
	var idempotencyKeys []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		idempotencyKeys = append(idempotencyKeys, r.Header.Get("Idempotency-Key"))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"product":{"reference":"plus-resilience"}}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	input := CreateCommercialProductInput{
		Reference:       "plus-resilience",
		DisplayName:     "Plus Resilience",
		PriceMinorUnits: 1000,
		Currency:        "SAR",
		BillingCycle:    "monthly",
	}

	if _, err := c.CreateCommercialProduct(context.Background(), input); err != nil {
		t.Fatalf("unexpected error on first call: %v", err)
	}
	if _, err := c.CreateCommercialProduct(context.Background(), input); err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}

	if len(idempotencyKeys) != 2 {
		t.Fatalf("expected 2 recorded calls, got %d", len(idempotencyKeys))
	}
	if idempotencyKeys[0] == "" {
		t.Fatal("expected non-empty idempotency key")
	}
	if idempotencyKeys[0] != idempotencyKeys[1] {
		t.Fatalf("expected identical calls to produce identical idempotency keys, got %q and %q", idempotencyKeys[0], idempotencyKeys[1])
	}
}

// TestAppendLoyaltyEntryHasDeterministicRequiredHeaders covers the
// loyalty.go mutation surface: AppendLoyaltyEntry must always send non-empty
// required mutation headers, and two identical calls must derive the
// identical idempotency key so a replay is safe.
func TestAppendLoyaltyEntryHasDeterministicRequiredHeaders(t *testing.T) {
	var idempotencyKeys []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		idempotencyKeys = append(idempotencyKeys, r.Header.Get("Idempotency-Key"))
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"entry":{"id":"loyalty-1"}}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	input := AppendLoyaltyEntryInput{
		ClientID:   "client-1",
		Direction:  "credit",
		Points:     10,
		SourceType: "order",
		SourceID:   "order-loyalty-1",
	}

	if _, err := c.AppendLoyaltyEntry(context.Background(), input); err != nil {
		t.Fatalf("unexpected error on first call: %v", err)
	}
	if _, err := c.AppendLoyaltyEntry(context.Background(), input); err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}

	if len(idempotencyKeys) != 2 {
		t.Fatalf("expected 2 recorded calls, got %d", len(idempotencyKeys))
	}
	if idempotencyKeys[0] == "" {
		t.Fatal("expected non-empty idempotency key")
	}
	if idempotencyKeys[0] != idempotencyKeys[1] {
		t.Fatalf("expected identical calls to produce identical idempotency keys, got %q and %q", idempotencyKeys[0], idempotencyKeys[1])
	}
}

// TestFinanceWriteHasDeterministicRequiredHeaders covers the
// finance_proxy.go mutation surface: FinanceWrite must always send non-empty
// required mutation headers, and two identical calls must derive the
// identical idempotency key so a replay is safe.
func TestFinanceWriteHasDeterministicRequiredHeaders(t *testing.T) {
	var idempotencyKeys []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requireMutationHeaders(t, r)
		idempotencyKeys = append(idempotencyKeys, r.Header.Get("Idempotency-Key"))
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	body := []byte(`{"actorId":"payout-1"}`)

	if _, _, err := c.FinanceWrite(context.Background(), http.MethodPost, "/wlt/payout-requests", body, "corr-payout-1"); err != nil {
		t.Fatalf("unexpected error on first call: %v", err)
	}
	if _, _, err := c.FinanceWrite(context.Background(), http.MethodPost, "/wlt/payout-requests", body, "corr-payout-1"); err != nil {
		t.Fatalf("unexpected error on second call: %v", err)
	}

	if len(idempotencyKeys) != 2 {
		t.Fatalf("expected 2 recorded calls, got %d", len(idempotencyKeys))
	}
	if idempotencyKeys[0] == "" {
		t.Fatal("expected non-empty idempotency key")
	}
	if idempotencyKeys[0] != idempotencyKeys[1] {
		t.Fatalf("expected identical calls to produce identical idempotency keys, got %q and %q", idempotencyKeys[0], idempotencyKeys[1])
	}
}
