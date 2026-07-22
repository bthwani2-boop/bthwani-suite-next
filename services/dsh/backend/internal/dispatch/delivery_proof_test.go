package dispatch

import (
	"strings"
	"testing"
	"time"
)

func TestRandomDeliveryPINIsSixDigits(t *testing.T) {
	for i := 0; i < 64; i++ {
		pin, err := randomDeliveryPIN()
		if err != nil {
			t.Fatalf("randomDeliveryPIN: %v", err)
		}
		if len(pin) != deliveryPINLength {
			t.Fatalf("pin length=%d want %d", len(pin), deliveryPINLength)
		}
		for _, digit := range pin {
			if digit < '0' || digit > '9' {
				t.Fatalf("pin contains non-digit: %q", pin)
			}
		}
	}
}

func TestDeliveryPINHashIsAssignmentBound(t *testing.T) {
	first := hashDeliveryPIN("assignment-a", "123456")
	second := hashDeliveryPIN("assignment-b", "123456")
	if first == second {
		t.Fatal("same clear PIN must not produce the same hash for different assignments")
	}
	if len(first) != 64 || strings.Contains(first, "123456") {
		t.Fatalf("unexpected hash representation %q", first)
	}
}

func TestValidateDeliveryProofInputRequiresMethodSpecificEvidence(t *testing.T) {
	tests := []struct {
		name    string
		input   SubmitDeliveryProofInput
		wantErr bool
	}{
		{name: "otp valid", input: SubmitDeliveryProofInput{Method: DeliveryProofOTP, PIN: "123456"}},
		{name: "otp missing", input: SubmitDeliveryProofInput{Method: DeliveryProofOTP}, wantErr: true},
		{name: "photo valid", input: SubmitDeliveryProofInput{Method: DeliveryProofPhoto, PhotoMediaRef: "media-photo"}},
		{name: "photo missing", input: SubmitDeliveryProofInput{Method: DeliveryProofPhoto}, wantErr: true},
		{name: "signature valid", input: SubmitDeliveryProofInput{Method: DeliveryProofSignature, SignatureMediaRef: "media-signature"}},
		{name: "signature missing", input: SubmitDeliveryProofInput{Method: DeliveryProofSignature}, wantErr: true},
		{name: "composite photo valid", input: SubmitDeliveryProofInput{Method: DeliveryProofComposite, PIN: "123456", PhotoMediaRef: "media-photo"}},
		{name: "composite signature valid", input: SubmitDeliveryProofInput{Method: DeliveryProofComposite, PIN: "123456", SignatureMediaRef: "media-signature"}},
		{name: "composite missing pin", input: SubmitDeliveryProofInput{Method: DeliveryProofComposite, PhotoMediaRef: "media-photo"}, wantErr: true},
		{name: "partial coordinates", input: SubmitDeliveryProofInput{Method: DeliveryProofOTP, PIN: "123456", CapturedLatitude: float64Pointer(15.3)}, wantErr: true},
		{name: "invalid latitude", input: SubmitDeliveryProofInput{Method: DeliveryProofOTP, PIN: "123456", CapturedLatitude: float64Pointer(91), CapturedLongitude: float64Pointer(44)}, wantErr: true},
		{name: "invalid longitude", input: SubmitDeliveryProofInput{Method: DeliveryProofOTP, PIN: "123456", CapturedLatitude: float64Pointer(15), CapturedLongitude: float64Pointer(181)}, wantErr: true},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateDeliveryProofInput(test.input)
			if test.wantErr && err == nil {
				t.Fatal("expected validation error")
			}
			if !test.wantErr && err != nil {
				t.Fatalf("unexpected validation error: %v", err)
			}
		})
	}
}

func TestDeliveryProofFingerprintChangesWithOperationalEvidence(t *testing.T) {
	capturedAt := time.Date(2026, time.July, 22, 3, 0, 0, 0, time.UTC)
	base := SubmitDeliveryProofInput{
		Method:         DeliveryProofOTP,
		PIN:            "123456",
		IdempotencyKey: "proof-key",
	}
	first := deliveryProofFingerprint("assignment-a", "captain-a", base, capturedAt)
	changedPIN := base
	changedPIN.PIN = "654321"
	second := deliveryProofFingerprint("assignment-a", "captain-a", changedPIN, capturedAt)
	if first == second {
		t.Fatal("fingerprint must change when proof evidence changes")
	}
	if first == deliveryProofFingerprint("assignment-a", "captain-b", base, capturedAt) {
		t.Fatal("fingerprint must be actor-bound")
	}
}

func float64Pointer(value float64) *float64 {
	return &value
}
