package payment

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"strconv"
	"testing"
	"time"
)

func TestPaymentOperationHashBindsTenantSessionAndOperation(t *testing.T) {
	base := paymentOperationHash("tenant-a", "ps-1", "authorize")
	if len(base) != 64 {
		t.Fatalf("expected sha256 hex hash, got %q", base)
	}
	for name, candidate := range map[string]string{
		"tenant":    paymentOperationHash("tenant-b", "ps-1", "authorize"),
		"session":   paymentOperationHash("tenant-a", "ps-2", "authorize"),
		"operation": paymentOperationHash("tenant-a", "ps-1", "capture"),
	} {
		if candidate == base {
			t.Fatalf("%s change must alter request hash", name)
		}
	}
	if paymentOperationHash("tenant-a", "ps-1", "authorize") != base {
		t.Fatal("same operation identity must produce a stable hash")
	}
}

func TestVerifyProviderWebhook(t *testing.T) {
	now := time.Date(2026, 7, 22, 12, 0, 0, 0, time.UTC)
	secret := "unit-test-webhook-secret"
	body := []byte(`{"eventId":"evt-1","status":"captured"}`)
	timestamp := strconv.FormatInt(now.Unix(), 10)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(timestamp))
	_, _ = mac.Write([]byte("."))
	_, _ = mac.Write(body)
	signature := "sha256=" + hex.EncodeToString(mac.Sum(nil))

	signedAt, ok := verifyProviderWebhook(secret, timestamp, signature, body, now)
	if !ok || !signedAt.Equal(now) {
		t.Fatalf("valid signature was rejected: ok=%v signedAt=%s", ok, signedAt)
	}
	if _, ok := verifyProviderWebhook(secret, timestamp, signature, append(body, ' '), now); ok {
		t.Fatal("mutated body must invalidate signature")
	}
	if _, ok := verifyProviderWebhook(secret, timestamp, signature, body, now.Add(6*time.Minute)); ok {
		t.Fatal("stale signature must be rejected")
	}
	if _, ok := verifyProviderWebhook("", timestamp, signature, body, now); ok {
		t.Fatal("missing secret must fail closed")
	}
}

func TestProviderStatusEventTypeMapping(t *testing.T) {
	cases := map[string]string{
		"authorized": "payment.authorized",
		"captured":   "payment.captured",
		"failed":     "payment.failed",
		"expired":    "payment.expired",
		"unknown":    "",
	}
	for status, expected := range cases {
		if actual := providerEventTypeForStatus(status); actual != expected {
			t.Fatalf("status %q: expected %q, got %q", status, expected, actual)
		}
	}
}

func TestLegalAuthoritativePaymentTransitions(t *testing.T) {
	allowed := [][2]string{
		{"reference_created", "authorized"},
		{"authorization_pending", "authorized"},
		{"provider_result_unknown", "captured"},
		{"authorized", "captured"},
		{"capture_pending", "failed"},
		{"pending_provider", "expired"},
		{"captured", "captured"},
	}
	for _, transition := range allowed {
		if !legalAuthoritativeTransition(transition[0], transition[1]) {
			t.Fatalf("expected transition %s -> %s to be legal", transition[0], transition[1])
		}
	}
	blocked := [][2]string{
		{"captured", "failed"},
		{"captured", "expired"},
		{"failed", "captured"},
		{"expired", "authorized"},
		{"cod_collected", "captured"},
		{"reference_created", "provider_result_unknown"},
	}
	for _, transition := range blocked {
		if legalAuthoritativeTransition(transition[0], transition[1]) {
			t.Fatalf("expected transition %s -> %s to be blocked", transition[0], transition[1])
		}
	}
}
