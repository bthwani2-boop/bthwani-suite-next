package checkout

import (
	"errors"
	"testing"
)

func TestCreateIntentRejectsMissingRequiredFields(t *testing.T) {
	cases := []struct {
		name  string
		input CreateIntentInput
	}{
		{"missing id", CreateIntentInput{TenantID: "tenant-1", ClientID: "c1", CartID: "cart1", StoreID: "s1"}},
		{"missing tenantId", CreateIntentInput{ID: "i1", ClientID: "c1", CartID: "cart1", StoreID: "s1"}},
		{"missing clientId", CreateIntentInput{ID: "i1", TenantID: "tenant-1", CartID: "cart1", StoreID: "s1"}},
		{"missing cartId", CreateIntentInput{ID: "i1", TenantID: "tenant-1", ClientID: "c1", StoreID: "s1"}},
		{"missing storeId", CreateIntentInput{ID: "i1", TenantID: "tenant-1", ClientID: "c1", CartID: "cart1"}},
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
		StatePending:           true,
		StateWltHandoffFailed:  true,
		StateWltOutcomeUnknown: true,
		StatePaymentPending:    true,
		StateConfirmed:         true,
		StateCancelled:         true,
		StateExpired:           true,
	}
	if len(states) != 7 {
		t.Fatalf("expected 7 distinct intent states, got %d", len(states))
	}
}

func TestApplyWltPaymentEventRejectsMissingFields(t *testing.T) {
	if _, err := ApplyWltPaymentEvent(nil, "", "intent-1", "session-1", "captured"); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing tenantId, got %v", err)
	}
	if _, err := ApplyWltPaymentEvent(nil, "tenant-1", "", "session-1", "captured"); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing intentId, got %v", err)
	}
	if _, err := ApplyWltPaymentEvent(nil, "tenant-1", "intent-1", "", "captured"); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing paymentSessionId, got %v", err)
	}
	if _, err := ApplyWltPaymentEvent(nil, "tenant-1", "intent-1", "session-1", ""); err != ErrInvalid {
		t.Fatalf("expected ErrInvalid for missing status, got %v", err)
	}
}

func TestApplyWltPaymentEventRejectsUnsupportedStatus(t *testing.T) {
	_, err := ApplyWltPaymentEvent(nil, "tenant-1", "intent-1", "session-1", "not-a-real-status")
	if !errors.Is(err, ErrInvalid) {
		t.Fatalf("expected ErrInvalid for unsupported status, got %v", err)
	}
}

func TestNewPaymentConfirmationStateConstants(t *testing.T) {
	states := map[IntentState]bool{
		StatePaymentConfirmed: true,
		StatePaymentFailed:    true,
	}
	if len(states) != 2 {
		t.Fatalf("expected 2 distinct new payment confirmation states, got %d", len(states))
	}
}

func TestPaymentEventTargetStateDistinguishesExpired(t *testing.T) {
	state, intermediate, err := paymentEventTargetState("expired")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if intermediate || state != StateExpired {
		t.Fatalf("expected terminal expired state, got state=%q intermediate=%v", state, intermediate)
	}
	state, intermediate, err = paymentEventTargetState("failed")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if intermediate || state != StatePaymentFailed {
		t.Fatalf("expected terminal payment_failed state, got state=%q intermediate=%v", state, intermediate)
	}
}
