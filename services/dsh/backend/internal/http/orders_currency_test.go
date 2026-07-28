package http

import (
	"testing"

	"dsh-api/internal/orders"
)

func TestMarshalOrderPreservesCurrencyTruth(t *testing.T) {
	order := &orders.Order{
		ID:               "order-1",
		CheckoutIntentID: "checkout-1",
		StoreID:          "store-1",
		FulfillmentMode:  "pickup",
		ClientID:         "client-1",
		Status:           orders.StatusPending,
		WltPaymentRefID:  "wlt-1",
		Currency:         "USD",
		Items: []orders.OrderItem{
			{
				ID:          "item-1",
				OrderID:     "order-1",
				ProductID:   "product-1",
				ProductName: "Product One",
				Quantity:    2,
				UnitPrice:   12.5,
				Currency:    "USD",
			},
		},
	}

	payload := marshalOrder(order)
	if payload["currency"] != "USD" {
		t.Fatalf("expected order currency USD, got %#v", payload["currency"])
	}
	items, ok := payload["items"].([]map[string]any)
	if !ok || len(items) != 1 {
		t.Fatalf("expected one marshalled item, got %#v", payload["items"])
	}
	if items[0]["currency"] != "USD" {
		t.Fatalf("expected item currency USD, got %#v", items[0]["currency"])
	}
	if payload["totalPrice"] != 25.0 {
		t.Fatalf("expected totalPrice 25, got %#v", payload["totalPrice"])
	}
}
