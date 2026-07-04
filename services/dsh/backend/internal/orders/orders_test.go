package orders

import "testing"

func TestCreateOrderRejectsMissingRequiredFields(t *testing.T) {
	cases := []struct {
		name  string
		input CreateOrderInput
	}{
		{"missing checkoutIntentId", CreateOrderInput{StoreID: "s1", ClientID: "c1", Items: []CreateOrderItemInput{{ProductID: "p1", Quantity: 1}}}},
		{"missing storeId", CreateOrderInput{CheckoutIntentID: "i1", ClientID: "c1", Items: []CreateOrderItemInput{{ProductID: "p1", Quantity: 1}}}},
		{"missing clientId", CreateOrderInput{CheckoutIntentID: "i1", StoreID: "s1", Items: []CreateOrderItemInput{{ProductID: "p1", Quantity: 1}}}},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			_, err := CreateOrder(nil, c.input)
			if err != ErrInvalid {
				t.Fatalf("expected ErrInvalid for %s, got %v", c.name, err)
			}
		})
	}
}

func TestCreateOrderRejectsEmptyItems(t *testing.T) {
	_, err := CreateOrder(nil, CreateOrderInput{
		CheckoutIntentID: "i1", StoreID: "s1", ClientID: "c1", Items: nil,
	})
	if err == nil {
		t.Fatal("expected error for empty items")
	}
}

func TestRejectOrderRequiresReason(t *testing.T) {
	_, err := RejectOrder(nil, "order-1", "actor-1", "")
	if err == nil {
		t.Fatal("expected error when rejection reason is empty")
	}
}

func TestCancelOrderByOperatorRequiresReason(t *testing.T) {
	_, err := CancelOrderByOperator(nil, "order-1", "actor-1", "")
	if err == nil {
		t.Fatal("expected error when cancellation reason is empty")
	}
}

func TestOrderStatusConstantsAreDistinct(t *testing.T) {
	statuses := map[OrderStatus]bool{
		StatusPending:         true,
		StatusStoreAccepted:   true,
		StatusPreparing:       true,
		StatusReadyForPickup:  true,
		StatusDriverAssigned:  true,
		StatusArrivedStore:    true,
		StatusPickedUp:        true,
		StatusArrivedCustomer: true,
		StatusDelivered:       true,
		StatusCancelled:       true,
	}
	if len(statuses) != 10 {
		t.Fatalf("expected 10 distinct order statuses, got %d", len(statuses))
	}
}
