package operationaloutbox

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestHTTPPushProviderSendsGovernedPayload(t *testing.T) {
	var received PushMessage
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			t.Errorf("expected POST, got %s", r.Method)
		}
		if got := r.Header.Get("Idempotency-Key"); got != "delivery-1" {
			t.Errorf("expected idempotency key delivery-1, got %q", got)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer provider-token" {
			t.Errorf("expected provider bearer token, got %q", got)
		}
		if err := json.NewDecoder(r.Body).Decode(&received); err != nil {
			t.Errorf("decode request: %v", err)
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"messageId":"provider-message-1"}`))
	}))
	defer server.Close()

	provider, err := NewHTTPPushProvider(server.URL, "provider-token", time.Second)
	if err != nil {
		t.Fatalf("configure provider: %v", err)
	}
	messageID, err := provider.Send(context.Background(), PushMessage{
		IdempotencyKey: "delivery-1",
		NotificationID: "notification-1",
		Tokens:         []string{"ExponentPushToken[test]"},
		Title:          "تحديث طلب",
		Body:           "تم تحديث الطلب",
		Data: map[string]string{
			"actionUrl": "/orders/order-1",
		},
	})
	if err != nil {
		t.Fatalf("send push: %v", err)
	}
	if messageID != "provider-message-1" {
		t.Fatalf("expected provider message id, got %q", messageID)
	}
	if received.NotificationID != "notification-1" || len(received.Tokens) != 1 {
		t.Fatalf("unexpected payload: %+v", received)
	}
	if received.Data["actionUrl"] != "/orders/order-1" {
		t.Fatalf("expected governed action URL, got %+v", received.Data)
	}
}

func TestHTTPPushProviderRejectsFailureResponse(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "provider unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	provider, err := NewHTTPPushProvider(server.URL, "", time.Second)
	if err != nil {
		t.Fatalf("configure provider: %v", err)
	}
	_, err = provider.Send(context.Background(), PushMessage{
		IdempotencyKey: "delivery-2",
		NotificationID: "notification-2",
		Tokens:         []string{"ExponentPushToken[test]"},
		Title:          "title",
		Body:           "body",
		Data:           map[string]string{},
	})
	if err == nil || !strings.Contains(err.Error(), "503") {
		t.Fatalf("expected provider failure with status, got %v", err)
	}
}

func TestNewHTTPPushProviderRejectsInvalidEndpoint(t *testing.T) {
	for _, endpoint := range []string{"", "not-a-url", "ftp://push.example.test"} {
		if _, err := NewHTTPPushProvider(endpoint, "", time.Second); err == nil {
			t.Fatalf("expected endpoint %q to be rejected", endpoint)
		}
	}
}
