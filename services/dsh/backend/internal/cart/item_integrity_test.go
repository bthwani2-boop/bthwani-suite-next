package cart

import (
	"context"
	"testing"
)

func TestUpsertOwnedItemRejectsIncompleteAuthorityContext(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		clientID string
		storeID  string
		cartID   string
		input    UpsertItemInput
	}{
		{name: "missing client", storeID: "store-1", cartID: "cart-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}},
		{name: "missing store", clientID: "client-1", cartID: "cart-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}},
		{name: "missing cart", clientID: "client-1", storeID: "store-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}},
		{name: "missing product", clientID: "client-1", storeID: "store-1", cartID: "cart-1", input: UpsertItemInput{Quantity: 1}},
		{name: "invalid quantity", clientID: "client-1", storeID: "store-1", cartID: "cart-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 0}},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			item, err := UpsertOwnedItem(
				context.Background(),
				nil,
				test.clientID,
				test.storeID,
				test.cartID,
				test.input,
			)
			if err != ErrInvalid {
				t.Fatalf("UpsertOwnedItem() error = %v, want ErrInvalid", err)
			}
			if item != nil {
				t.Fatalf("UpsertOwnedItem() item = %+v, want nil", item)
			}
		})
	}
}

func TestHydrateOperatorCartItemsNormalizesEmptyInput(t *testing.T) {
	t.Parallel()

	carts, err := HydrateOperatorCartItems(context.Background(), nil, nil)
	if err != nil {
		t.Fatalf("HydrateOperatorCartItems() error = %v", err)
	}
	if carts == nil {
		t.Fatal("HydrateOperatorCartItems() returned nil; want an empty operational list")
	}
	if len(carts) != 0 {
		t.Fatalf("HydrateOperatorCartItems() length = %d, want 0", len(carts))
	}
}
