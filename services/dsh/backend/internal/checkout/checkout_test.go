package checkout

import "testing"

func TestCreateIntentRejectsMissingRequiredFields(t *testing.T) {
	cases := []struct {
		name  string
		input CreateIntentInput
	}{
		{"missing id", CreateIntentInput{ClientID: "c1", CartID: "cart1", StoreID: "s1"}},
		{"missing clientId", CreateIntentInput{ID: "i1", CartID: "cart1", StoreID: "s1"}},
		{"missing cartId", CreateIntentInput{ID: "i1", ClientID: "c1", StoreID: "s1"}},
		{"missing storeId", CreateIntentInput{ID: "i1", ClientID: "c1", CartID: "cart1"}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := CreateIntent(nil, c.input)
			if err != ErrInvalid {
				t.Fatalf("expected ErrInvalid for %s, got %v", c.name, err)
			}
		})
	}
}

func TestPaymentMethodConstants(t *testing.T) {
	methods := map[PaymentMethod]bool{
		MethodCOD:            true,
		MethodWallet:         true,
		MethodMixed:          true,
		MethodOfficialWallet: true,
	}
	if len(methods) != 4 {
		t.Fatalf("expected 4 distinct payment methods, got %d", len(methods))
	}
}

func TestIntentStateConstants(t *testing.T) {
	states := map[IntentState]bool{
		StatePending:        true,
		StatePaymentPending: true,
		StateConfirmed:      true,
		StateCancelled:      true,
		StateExpired:        true,
	}
	if len(states) != 5 {
		t.Fatalf("expected 5 distinct intent states, got %d", len(states))
	}
}
