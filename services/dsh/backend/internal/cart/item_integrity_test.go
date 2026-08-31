package cart

import (
	"context"
	"errors"
	"testing"
)

func TestUpsertItemIdempotentRejectsIncompleteMutationContext(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		clientID string
		storeID  string
		input    UpsertItemInput
		mutation MutationContext
	}{
		{name: "missing client", storeID: "store-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}, mutation: MutationContext{IdempotencyKey: "idem-0001", CorrelationID: "corr-0001"}},
		{name: "missing store", clientID: "client-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}, mutation: MutationContext{IdempotencyKey: "idem-0002", CorrelationID: "corr-0002"}},
		{name: "missing idempotency key", clientID: "client-1", storeID: "store-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}, mutation: MutationContext{CorrelationID: "corr-0003"}},
		{name: "missing correlation id", clientID: "client-1", storeID: "store-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 1}, mutation: MutationContext{IdempotencyKey: "idem-0004"}},
		{name: "missing product", clientID: "client-1", storeID: "store-1", input: UpsertItemInput{Quantity: 1}, mutation: MutationContext{IdempotencyKey: "idem-0005", CorrelationID: "corr-0005"}},
		{name: "invalid quantity", clientID: "client-1", storeID: "store-1", input: UpsertItemInput{MasterProductID: "product-1", Quantity: 0}, mutation: MutationContext{IdempotencyKey: "idem-0006", CorrelationID: "corr-0006"}},
	}

	for _, test := range tests {
		test := test
		t.Run(test.name, func(t *testing.T) {
			t.Parallel()
			result, err := UpsertItemIdempotent(
				context.Background(),
				nil,
				test.clientID,
				test.storeID,
				ModeBthwaniDelivery,
				test.input,
				test.mutation,
			)
			if !errors.Is(err, ErrInvalid) {
				t.Fatalf("UpsertItemIdempotent() error = %v, want ErrInvalid", err)
			}
			if result != nil {
				t.Fatalf("UpsertItemIdempotent() result = %+v, want nil", result)
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
