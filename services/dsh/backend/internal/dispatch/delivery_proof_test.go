package dispatch

import (
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func TestRandomDeliveryPINIsSixDigits(t *testing.T) {
	for i := 0; i < 64; i++ {
		pin, err := randomDeliveryPIN()
		if err != nil {
			t.Fatalf("randomDeliveryPIN: %v", err)
		}
		if !isSixDigitPIN(pin) {
			t.Fatalf("invalid generated PIN %q", pin)
		}
	}
}

func TestDeliveryPINHashIsSlowAndAssignmentBound(t *testing.T) {
	hash, err := hashDeliveryPIN("assignment-a", "123456")
	if err != nil {
		t.Fatalf("hashDeliveryPIN: %v", err)
	}
	if !strings.HasPrefix(hash, "$2") || strings.Contains(hash, "123456") {
		t.Fatalf("unexpected bcrypt representation %q", hash)
	}
	if err = bcrypt.CompareHashAndPassword([]byte(hash), []byte("assignment-a:123456")); err != nil {
		t.Fatalf("correct assignment-bound PIN did not match: %v", err)
	}
	if err = bcrypt.CompareHashAndPassword([]byte(hash), []byte("assignment-b:123456")); err == nil {
		t.Fatal("same clear PIN must not verify for a different assignment")
	}
}

func TestSixDigitPINFormat(t *testing.T) {
	for _, value := range []string{"", "12345", "1234567", "12A456", "١٢٣٤٥٦"} {
		if isSixDigitPIN(value) {
			t.Fatalf("invalid PIN format accepted: %q", value)
		}
	}
	if !isSixDigitPIN("000042") {
		t.Fatal("valid six digit PIN rejected")
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

func TestDeliveryProofFingerprintIsStableWhenCapturedAtOmitted(t *testing.T) {
	input := SubmitDeliveryProofInput{
		Method:         DeliveryProofPhoto,
		PhotoMediaRef:  "media-photo",
		IdempotencyKey: "proof-key",
	}
	first := deliveryProofFingerprint("assignment-a", "captain-a", input, time.Time{})
	second := deliveryProofFingerprint("assignment-a", "captain-a", input, time.Time{})
	if first != second {
		t.Fatal("same idempotent payload must have a stable fingerprint")
	}
}

func float64Pointer(value float64) *float64 {
	return &value
}
