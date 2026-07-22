package http

import (
	"testing"

	"dsh-api/internal/platformpolicies"
)

func TestJRN029GuardedMutationPaths(t *testing.T) {
	for _, path := range []string{
		"/dsh/client/cart/items",
		"/dsh/client/cart/serviceability",
		"/dsh/client/checkout-intents",
		"/dsh/client/orders",
		"/dsh/operator/dispatch/assignments",
	} {
		if !isJRN029GuardedPath(path) {
			t.Fatalf("expected %s to be guarded", path)
		}
	}
	if isJRN029GuardedPath("/dsh/client/orders/order-1") {
		t.Fatal("read/detail paths must not be treated as creation mutations")
	}
}

func TestJRN029EffectAllowedUsesCanonicalDecisionEffects(t *testing.T) {
	decision := platformpolicies.OperationalDecision{
		Effects: platformpolicies.OperationalEffects{
			CartAllowed:          true,
			CheckoutAllowed:      false,
			OrderCreationAllowed: true,
			DispatchAllowed:      false,
		},
	}
	cases := []struct {
		effect string
		want   bool
	}{
		{jrn029EffectCart, true},
		{jrn029EffectCheckout, false},
		{jrn029EffectOrder, true},
		{jrn029EffectDispatch, false},
		{"unknown", false},
	}
	for _, tc := range cases {
		if got := jrn029EffectAllowed(decision, tc.effect); got != tc.want {
			t.Fatalf("effect %q=%v, want %v", tc.effect, got, tc.want)
		}
	}
}
