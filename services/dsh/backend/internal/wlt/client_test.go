package wlt

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestClientNotConfiguredRejectsWithoutNetworkCall(t *testing.T) {
	c := NewClient("", "")
	if c.Configured() {
		t.Fatalf("expected client with empty baseURL to be unconfigured")
	}
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error when client is not configured")
	}
	if !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestClientNotConfiguredWithoutServiceToken(t *testing.T) {
	c := NewClient("https://wlt.internal", "")
	if c.Configured() {
		t.Fatalf("expected client with missing service token to be unconfigured")
	}
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected not configured error, got: %v", err)
	}
}

func TestCreatePaymentSessionSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/wlt/payment-sessions" {
			t.Fatalf("expected /wlt/payment-sessions, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		if r.Header.Get("X-Correlation-ID") != "corr-1" {
			t.Fatalf("expected X-Correlation-ID=corr-1, got %q", r.Header.Get("X-Correlation-ID"))
		}
		if r.Header.Get("Idempotency-Key") != "idem-1" {
			t.Fatalf("expected Idempotency-Key=idem-1, got %q", r.Header.Get("Idempotency-Key"))
		}
		var input CreatePaymentSessionInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if input.CheckoutIntentID != "intent-1" {
			t.Fatalf("expected checkoutIntentId=intent-1, got %q", input.CheckoutIntentID)
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{
				ID:               "ps-1",
				CheckoutIntentID: "intent-1",
				ClientID:         "client-1",
				StoreID:          "store-1",
				PaymentMethod:    "wallet",
				Status:           "pending",
			},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	if !c.Configured() {
		t.Fatalf("expected client to be configured")
	}

	session, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{
		CheckoutIntentID: "intent-1",
		ClientID:         "client-1",
		StoreID:          "store-1",
		PaymentMethod:    "wallet",
		CorrelationID:    "corr-1",
		IdempotencyKey:   "idem-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if session.ID != "ps-1" {
		t.Fatalf("expected session id=ps-1, got %q", session.ID)
	}
	if session.Status != "pending" {
		t.Fatalf("expected status=pending, got %q", session.Status)
	}
}

func TestCreatePaymentSessionNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error for HTTP 500 response")
	}
	if !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error to mention status 500, got: %v", err)
	}
}

func TestCreatePaymentSessionMalformedBody(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("{not-json"))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error for malformed JSON response")
	}
	if !strings.Contains(err.Error(), "decode") {
		t.Fatalf("expected decode error, got: %v", err)
	}
}

func TestCreatePaymentSessionMissingID(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(map[string]any{
			"paymentSession": PaymentSession{
				CheckoutIntentID: "intent-1",
			},
		})
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error when response is missing paymentSession.id")
	}
	if !strings.Contains(err.Error(), "missing id") {
		t.Fatalf("expected 'missing id' error, got: %v", err)
	}
}

func TestNewClientTrimsTrailingSlash(t *testing.T) {
	c := NewClient("https://wlt.internal/", "test-service-token")
	if c.baseURL != "https://wlt.internal" {
		t.Fatalf("expected trailing slash to be trimmed, got %q", c.baseURL)
	}
}

func TestNotifyDeliveryCompletedSendsServiceHeaders(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/wlt/cod-records" {
			t.Fatalf("expected /wlt/cod-records, got %s", r.URL.Path)
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		var input NotifyDeliveryCompletedInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			t.Fatalf("failed to decode request body: %v", err)
		}
		if input.OrderID != "order-1" || input.CheckoutIntentID != "intent-1" {
			t.Fatalf("unexpected input: %+v", input)
		}
		w.WriteHeader(http.StatusCreated)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	err := c.NotifyDeliveryCompleted(context.Background(), NotifyDeliveryCompletedInput{
		OrderID:          "order-1",
		CaptainID:        "captain-1",
		PartnerID:        "partner-1",
		CheckoutIntentID: "intent-1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestNotifyDeliveryCompletedNotConfigured(t *testing.T) {
	c := NewClient("", "")
	err := c.NotifyDeliveryCompleted(context.Background(), NotifyDeliveryCompletedInput{})
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestFinanceReadWalletBuildsPathParameterizedURL(t *testing.T) {
	var gotPath string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotPath = r.URL.Path
		if r.URL.RawQuery != "" {
			t.Fatalf("expected no query string for path-based wallet lookup, got %q", r.URL.RawQuery)
		}
		if r.Header.Get("Authorization") != "Bearer test-service-token" {
			t.Fatalf("expected Authorization=Bearer test-service-token, got %q", r.Header.Get("Authorization"))
		}
		if r.Header.Get("X-Service-Caller") != "dsh" {
			t.Fatalf("expected X-Service-Caller=dsh, got %q", r.Header.Get("X-Service-Caller"))
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"balanceMinorUnits":0}`))
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	status, body, err := c.FinanceReadWallet(context.Background(), "field", "field-123", "corr-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if status != http.StatusOK {
		t.Fatalf("expected 200, got %d", status)
	}
	if gotPath != "/wlt/wallets/field/field-123" {
		t.Fatalf("expected path /wlt/wallets/field/field-123, got %q", gotPath)
	}
	if !strings.Contains(string(body), "balanceMinorUnits") {
		t.Fatalf("expected body to be forwarded verbatim, got %q", body)
	}
}

func TestFinanceReadWalletEscapesActorIDSegment(t *testing.T) {
	var gotEscapedPath string
	var gotSegmentCount int
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// r.URL.Path is the *decoded* path (Go transparently decodes %2F back
		// into "/"), so the wire-level escaping must be verified against the
		// raw request target / escaped path, not the decoded one.
		gotEscapedPath = r.URL.EscapedPath()
		gotSegmentCount = len(strings.Split(strings.TrimPrefix(r.URL.EscapedPath(), "/"), "/"))
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	// An actor id containing a path separator must not be able to alter the
	// route shape (e.g. escape into another WLT collection) once the WLT
	// server routes on path segments.
	if _, _, err := c.FinanceReadWallet(context.Background(), "field", "../admin", "corr-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if gotEscapedPath != "/wlt/wallets/field/..%2Fadmin" {
		t.Fatalf("expected escaped path /wlt/wallets/field/..%%2Fadmin, got %q", gotEscapedPath)
	}
	if gotSegmentCount != 4 {
		t.Fatalf("expected exactly 4 path segments (wlt, wallets, field, <escaped actor id>), got %d from %q", gotSegmentCount, gotEscapedPath)
	}
}

func TestFinanceReadWalletRejectsUnknownActorType(t *testing.T) {
	c := NewClient("https://wlt.internal", "test-service-token")
	_, _, err := c.FinanceReadWallet(context.Background(), "captain", "captain-1", "corr-1")
	if err == nil || !strings.Contains(err.Error(), "not allowlisted") {
		t.Fatalf("expected not-allowlisted error, got: %v", err)
	}
}

func TestFinanceReadWalletRejectsEmptyActorID(t *testing.T) {
	c := NewClient("https://wlt.internal", "test-service-token")
	_, _, err := c.FinanceReadWallet(context.Background(), "field", "", "corr-1")
	if err == nil {
		t.Fatalf("expected error for empty actor id")
	}
}

func TestFinanceReadWalletNotConfigured(t *testing.T) {
	c := NewClient("", "")
	_, _, err := c.FinanceReadWallet(context.Background(), "field", "field-1", "corr-1")
	if err == nil || !strings.Contains(err.Error(), "not configured") {
		t.Fatalf("expected 'not configured' error, got: %v", err)
	}
}

func TestFinanceReadRejectsBareWalletsPathNowThatItRequiresActorSegments(t *testing.T) {
	// /wlt/wallets was removed from the query-based allowlist because the
	// real WLT route is path-parameterized (/wlt/wallets/{actorType}/{actorId}).
	c := NewClient("https://wlt.internal", "test-service-token")
	_, _, err := c.FinanceRead(context.Background(), "/wlt/wallets", nil, "corr-1")
	if err == nil || !strings.Contains(err.Error(), "not allowlisted") {
		t.Fatalf("expected not-allowlisted error for bare /wlt/wallets, got: %v", err)
	}
}

func TestNotifyDeliveryCompletedNonSuccessStatus(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	c := NewClient(server.URL, "test-service-token")
	err := c.NotifyDeliveryCompleted(context.Background(), NotifyDeliveryCompletedInput{OrderID: "order-1"})
	if err == nil || !strings.Contains(err.Error(), "500") {
		t.Fatalf("expected error mentioning status 500, got: %v", err)
	}
}
