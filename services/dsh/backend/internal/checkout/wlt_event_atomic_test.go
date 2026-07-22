package checkout

import (
	"errors"
	"testing"
)

func TestWltPaymentEventIdentityUsesStableDerivedKey(t *testing.T) {
	input := WltPaymentEventEnvelope{
		TenantID:         " tenant-a ",
		CheckoutIntentID: "11111111-1111-1111-1111-111111111111",
		PaymentSessionID: " session-a ",
		Status:           " captured ",
	}
	firstKey, firstHash, err := WltPaymentEventIdentity(input)
	if err != nil {
		t.Fatalf("identity failed: %v", err)
	}
	secondKey, secondHash, err := WltPaymentEventIdentity(input)
	if err != nil {
		t.Fatalf("second identity failed: %v", err)
	}
	if firstKey != secondKey || firstHash != secondHash {
		t.Fatalf("derived event identity is not deterministic: %q/%q vs %q/%q", firstKey, firstHash, secondKey, secondHash)
	}
	if len(firstHash) != 64 {
		t.Fatalf("payload hash must be sha256 hex, got %q", firstHash)
	}
}

func TestWltPaymentEventIdentityHonorsAuthorityEventID(t *testing.T) {
	key, _, err := WltPaymentEventIdentity(WltPaymentEventEnvelope{
		EventID:          "evt-authority-0001",
		TenantID:         "tenant-a",
		CheckoutIntentID: "11111111-1111-1111-1111-111111111111",
		PaymentSessionID: "session-a",
		Status:           "authorized",
	})
	if err != nil {
		t.Fatalf("identity failed: %v", err)
	}
	if key != "wlt:evt-authority-0001" {
		t.Fatalf("unexpected event key %q", key)
	}
}

func TestWltPaymentEventIdentityRejectsUnsupportedStatus(t *testing.T) {
	_, _, err := WltPaymentEventIdentity(WltPaymentEventEnvelope{
		TenantID:         "tenant-a",
		CheckoutIntentID: "11111111-1111-1111-1111-111111111111",
		PaymentSessionID: "session-a",
		Status:           "invented",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}

func TestWltPaymentEventIdentityRejectsShortAuthorityEventID(t *testing.T) {
	_, _, err := WltPaymentEventIdentity(WltPaymentEventEnvelope{
		EventID:          "tiny",
		TenantID:         "tenant-a",
		CheckoutIntentID: "11111111-1111-1111-1111-111111111111",
		PaymentSessionID: "session-a",
		Status:           "captured",
	})
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid, got %v", err)
	}
}
