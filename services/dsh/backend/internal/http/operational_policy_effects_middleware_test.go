package http

import (
	"testing"

	"dsh-api/internal/platformpolicies"
)

func TestOperationalPolicyGuardedMutationPaths(t *testing.T) {
	for _, path := range []string{
		"/dsh/client/cart/items",
		"/dsh/client/cart/serviceability",
		"/dsh/client/checkout-intents",
		"/dsh/client/orders",
		"/dsh/operator/dispatch/assignments",
	} {
		if !isOperationalPolicyGuardedPath(path) {
			t.Fatalf("expected %s to be guarded", path)
		}
	}
	if isOperationalPolicyGuardedPath("/dsh/client/orders/order-1") {
		t.Fatal("read/detail paths must not be treated as creation mutations")
	}
}

func TestOperationalPolicyEffectAllowedUsesCanonicalDecisionEffects(t *testing.T) {
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
		{operationalEffectCart, true},
		{operationalEffectCheckout, false},
		{operationalEffectOrder, true},
		{operationalEffectDispatch, false},
		{"unknown", false},
	}
	for _, tc := range cases {
		if got := operationalPolicyEffectAllowed(decision, tc.effect); got != tc.want {
			t.Fatalf("effect %q=%v, want %v", tc.effect, got, tc.want)
		}
	}
}
