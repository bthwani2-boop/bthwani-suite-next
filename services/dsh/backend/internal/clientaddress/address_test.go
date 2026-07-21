package clientaddress

import (
	"errors"
	"strings"
	"testing"
)

func str(value string) *string      { return &value }
func number(value float64) *float64 { return &value }

func validInput() CreateInput {
	return CreateInput{
		Label:                "  المنزل  ",
		RecipientName:        "  بسام  ",
		PhoneE164:            "+967771234567",
		AddressLine:          "  شارع حدة قرب المعلم  ",
		ServiceAreaCode:      "  haddah  ",
		Building:             str("  12  "),
		Floor:                str("  3  "),
		Unit:                 str("  A  "),
		DeliveryInstructions: str("  الاتصال قبل الوصول  "),
		Latitude:             number(15.352),
		Longitude:            number(44.178),
	}
}

func TestNormalizeClientAddressTrimsAndPreservesCoordinates(t *testing.T) {
	input, err := normalize(validInput())
	if err != nil {
		t.Fatalf("expected valid address, got %v", err)
	}
	if input.Label != "المنزل" || input.RecipientName != "بسام" || input.AddressLine != "شارع حدة قرب المعلم" {
		t.Fatalf("expected normalized required fields, got %+v", input)
	}
	if input.Building == nil || *input.Building != "12" || input.DeliveryInstructions == nil || *input.DeliveryInstructions != "الاتصال قبل الوصول" {
		t.Fatalf("expected normalized optional fields, got %+v", input)
	}
	if input.Latitude == nil || input.Longitude == nil || *input.Latitude != 15.352 || *input.Longitude != 44.178 {
		t.Fatalf("expected coordinates to remain unchanged, got %+v", input)
	}
}

func TestNormalizeClientAddressRejectsInvalidPhone(t *testing.T) {
	input := validInput()
	input.PhoneE164 = "0771234567"
	if _, err := normalize(input); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for non-E164 phone, got %v", err)
	}
}

func TestNormalizeClientAddressRequiresCoordinatePair(t *testing.T) {
	input := validInput()
	input.Longitude = nil
	if _, err := normalize(input); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for incomplete coordinate pair, got %v", err)
	}
}

func TestNormalizeClientAddressRejectsOutOfRangeCoordinates(t *testing.T) {
	input := validInput()
	input.Latitude = number(91)
	if _, err := normalize(input); !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for latitude outside range, got %v", err)
	}
}

func TestCheckoutSnapshotContainsOwnedOperationalFields(t *testing.T) {
	address := Address{
		AddressLine:          "شارع حدة",
		ServiceAreaCode:      "haddah",
		RecipientName:        "بسام",
		PhoneE164:            "+967771234567",
		Building:             str("12"),
		Floor:                str("3"),
		DeliveryInstructions: str("الاتصال قبل الوصول"),
	}
	snapshot := address.CheckoutSnapshot()
	for _, expected := range []string{
		"شارع حدة", "12", "3", "haddah", "بسام", "+967771234567", "instructions: الاتصال قبل الوصول",
	} {
		if !strings.Contains(snapshot, expected) {
			t.Fatalf("expected snapshot to contain %q, got %q", expected, snapshot)
		}
	}
}
