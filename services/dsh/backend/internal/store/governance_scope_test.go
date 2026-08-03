package store

import (
	"context"
	"testing"
)

func TestActorCanAccessStoreFailsClosedWithoutDatabase(t *testing.T) {
	allowed, err := ActorCanAccessStore(
		context.Background(),
		nil,
		nil,
		StoreActor{ID: "field-1", Role: "field", OperatorContextID: "operator-context-1"},
		"store-1",
	)
	if err != nil {
		t.Fatalf("ActorCanAccessStore() error = %v, want nil", err)
	}
	if allowed {
		t.Fatal("ActorCanAccessStore() allowed access without a database")
	}
}

func TestActorCanAccessStoreFailsClosedWithoutTrustedOperatorContext(t *testing.T) {
	allowed, err := ActorCanAccessStore(
		context.Background(),
		nil,
		nil,
		StoreActor{ID: "field-1", Role: "field"},
		"store-1",
	)
	if err != nil {
		t.Fatalf("ActorCanAccessStore() error = %v, want nil", err)
	}
	if allowed {
		t.Fatal("ActorCanAccessStore() allowed access without a trusted operator context")
	}
}
