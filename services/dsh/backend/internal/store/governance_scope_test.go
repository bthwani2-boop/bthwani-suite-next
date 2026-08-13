package store

import (
	"context"
	"os"
	"strings"
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

func TestPermissionScopeAllowsOnlyExplicitStoreOrAll(t *testing.T) {
	cases := []struct {
		name    string
		scope   string
		storeID string
		want    bool
	}{
		{name: "all", scope: "all", storeID: "store-1", want: true},
		{name: "matching store", scope: "store:store-1", storeID: "store-1", want: true},
		{name: "other store", scope: "store:store-2", storeID: "store-1", want: false},
		{name: "blank", scope: "", storeID: "store-1", want: false},
		{name: "role-like text", scope: "permission:partners.manage", storeID: "store-1", want: false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := permissionScopeAllowsStore(tc.scope, tc.storeID); got != tc.want {
				t.Fatalf("permissionScopeAllowsStore(%q, %q)=%v want %v", tc.scope, tc.storeID, got, tc.want)
			}
		})
	}
}

func TestActorStoreScopeDoesNotAcceptBlankOperatorContextCompatibilityRows(t *testing.T) {
	source, err := os.ReadFile("governance.go")
	if err != nil {
		t.Fatal(err)
	}
	text := string(source)
	if strings.Contains(text, "operator_context_id = $3 OR operator_context_id = ''") {
		t.Fatal("store scope resolution must reject blank operator-context compatibility rows")
	}
}
