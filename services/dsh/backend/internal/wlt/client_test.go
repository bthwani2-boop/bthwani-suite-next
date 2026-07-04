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
	c := NewClient("")
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

func TestCreatePaymentSessionSuccess(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Fatalf("expected POST, got %s", r.Method)
		}
		if r.URL.Path != "/wlt/payment-sessions" {
			t.Fatalf("expected /wlt/payment-sessions, got %s", r.URL.Path)
		}
		if r.Header.Get("Authorization") == "" {
			t.Fatalf("expected Authorization header")
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

	c := NewClient(server.URL)
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

	c := NewClient(server.URL)
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

	c := NewClient(server.URL)
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

	c := NewClient(server.URL)
	_, err := c.CreatePaymentSession(context.Background(), CreatePaymentSessionInput{})
	if err == nil {
		t.Fatalf("expected error when response is missing paymentSession.id")
	}
	if !strings.Contains(err.Error(), "missing id") {
		t.Fatalf("expected 'missing id' error, got: %v", err)
	}
}

func TestNewClientTrimsTrailingSlash(t *testing.T) {
	c := NewClient("https://wlt.internal/")
	if c.baseURL != "https://wlt.internal" {
		t.Fatalf("expected trailing slash to be trimmed, got %q", c.baseURL)
	}
}
