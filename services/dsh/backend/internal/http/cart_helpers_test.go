package http

import (
	"testing"

	"dsh-api/internal/cart"
)

func TestFulfillmentModeOrDefault(t *testing.T) {
	tests := []struct {
		name  string
		raw   string
		want  cart.FulfillmentMode
		valid bool
	}{
		{name: "omitted defaults to bthwani delivery", raw: "", want: cart.ModeBthwaniDelivery, valid: true},
		{name: "whitespace defaults to bthwani delivery", raw: "  ", want: cart.ModeBthwaniDelivery, valid: true},
		{name: "valid pickup", raw: " pickup ", want: cart.ModePickup, valid: true},
		{name: "valid partner delivery", raw: "partner_delivery", want: cart.ModePartnerDelivery, valid: true},
		{name: "unknown mode is rejected", raw: "courier", valid: false},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, valid := fulfillmentModeOrDefault(tc.raw)
			if valid != tc.valid || got != tc.want {
				t.Fatalf("fulfillmentModeOrDefault(%q)=(%q, %t), want (%q, %t)", tc.raw, got, valid, tc.want, tc.valid)
			}
		})
	}
}
