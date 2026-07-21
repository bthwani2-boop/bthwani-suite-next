package wlt

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestGetPaymentSessionUsesServiceTokenAndParsesTruth(t *testing.T) {
	updatedAt := time.Date(2026, 7, 21, 1, 2, 3, 0, time.UTC)
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			t.Fatalf("method=%s, want GET", r.Method)
		}
		if r.URL.Path != "/payment-sessions/session-1" {
			t.Fatalf("path=%s", r.URL.Path)
		}
		if got := r.Header.Get("X-Service-Token"); got != "service-secret" {
			t.Fatalf("service token=%q", got)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{
			"id":"session-1",
			"idempotencyKey":"checkout-1",
			"actorId":"client-1",
			"storeId":"store-1",
			"method":"official_wallet",
			"amount":12500,
			"currency":"YER",
			"status":"captured",
			"reference":"WLT-001",
			"createdAt":"2026-07-21T01:00:00Z",
			"updatedAt":"2026-07-21T01:02:03Z"
		}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-secret")
	session, err := client.GetPaymentSession(context.Background(), "session-1")
	if err != nil {
		t.Fatalf("GetPaymentSession: %v", err)
	}
	if session.ID != "session-1" || session.Status != "captured" || session.Method != "official_wallet" {
		t.Fatalf("unexpected session: %#v", session)
	}
	if !session.UpdatedAt.Equal(updatedAt) {
		t.Fatalf("updatedAt=%s, want %s", session.UpdatedAt, updatedAt)
	}
}

func TestGetPaymentSessionRejectsIncompleteResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"id":"session-1"}`))
	}))
	defer server.Close()

	client := NewClient(server.URL, "service-secret")
	if _, err := client.GetPaymentSession(context.Background(), "session-1"); err == nil {
		t.Fatal("incomplete WLT response must fail closed")
	}
}
