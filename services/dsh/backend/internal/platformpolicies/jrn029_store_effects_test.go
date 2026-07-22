package platformpolicies

import "testing"

func TestJRN029NormalizeFulfillmentMode(t *testing.T) {
	cases := []struct {
		input string
		want  string
	}{
		{"", FulfillmentModeBthwaniDelivery},
		{"bthwani_delivery", FulfillmentModeBthwaniDelivery},
		{"partner_delivery", FulfillmentModePartnerDelivery},
		{"pickup", FulfillmentModeClientPickup},
		{"client_pickup", FulfillmentModeClientPickup},
		{" CLIENT_PICKUP ", FulfillmentModeClientPickup},
	}
	for _, tc := range cases {
		got, err := NormalizeFulfillmentMode(tc.input)
		if err != nil {
			t.Fatalf("NormalizeFulfillmentMode(%q): %v", tc.input, err)
		}
		if got != tc.want {
			t.Fatalf("NormalizeFulfillmentMode(%q)=%q, want %q", tc.input, got, tc.want)
		}
	}
}

func TestJRN029NormalizeFulfillmentModeRejectsLocalTruth(t *testing.T) {
	if _, err := NormalizeFulfillmentMode("courier_magic"); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for unknown fulfillment mode, got %v", err)
	}
}
