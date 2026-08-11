package centralcatalog

import "testing"

func runtimeTruth(amountMinor int64, currency, policyType string, quantity, reserved, minimum, maximum, step int) assortmentRuntimeTruth {
	return assortmentRuntimeTruth{
		AmountMinor: amountMinor,
		Currency:    currency,
		assortmentInventoryTruth: assortmentInventoryTruth{
			PolicyType:       policyType,
			Quantity:         quantity,
			ReservedQuantity: reserved,
			MinOrderQuantity: minimum,
			MaxOrderQuantity: maximum,
			StepQuantity:     step,
		},
	}
}

func TestAssortmentTruthPurchasable(t *testing.T) {
	tests := []struct {
		name  string
		truth assortmentRuntimeTruth
		want  bool
	}{
		{
			name:  "signal with effective price and stock",
			truth: runtimeTruth(1250, "YER", "signal", 5, 0, 1, 100, 1),
			want:  true,
		},
		{
			name:  "missing price fails closed",
			truth: runtimeTruth(0, "YER", "signal", 5, 0, 1, 100, 1),
			want:  false,
		},
		{
			name:  "depleted quantity policy fails closed",
			truth: runtimeTruth(1250, "YER", "quantity", 4, 4, 1, 10, 1),
			want:  false,
		},
		{
			name:  "quantity policy must satisfy minimum order",
			truth: runtimeTruth(1250, "YER", "quantity", 2, 0, 3, 10, 1),
			want:  false,
		},
		{
			name:  "infinite policy is purchasable without signal quantity",
			truth: runtimeTruth(1250, "YER", "infinite", 0, 0, 1, 100, 1),
			want:  true,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := assortmentTruthPurchasable(tc.truth); got != tc.want {
				t.Fatalf("assortmentTruthPurchasable()=%v, want %v", got, tc.want)
			}
		})
	}
}

func TestInventoryAvailabilityDoesNotDependOnPrice(t *testing.T) {
	inventory := assortmentInventoryTruth{
		PolicyType:       "quantity",
		Quantity:         10,
		ReservedQuantity: 2,
		MinOrderQuantity: 2,
		MaxOrderQuantity: 20,
		StepQuantity:     2,
	}
	if !assortmentInventoryAvailable(inventory) {
		t.Fatal("inventory availability must remain true independent of timed price presence")
	}
	if got := assortmentInventoryStockStatus(inventory); got != "in_stock" {
		t.Fatalf("unexpected stock status: %s", got)
	}
	withoutPrice := assortmentRuntimeTruth{assortmentInventoryTruth: inventory}
	if assortmentTruthPurchasable(withoutPrice) {
		t.Fatal("purchasability must still fail closed without an effective price")
	}
}

func TestFilterClientCatalogDimensionsRemovesPhantoms(t *testing.T) {
	nodeA := "node-a"
	nodeB := "node-b"
	domains := []Domain{{ID: "domain-a"}, {ID: "domain-b"}}
	nodes := []Node{{ID: nodeA, DomainID: "domain-a"}, {ID: nodeB, DomainID: "domain-b"}}
	products := []ClientCatalogEntry{{
		MasterProduct: MasterProduct{ID: "product-a", DomainID: "domain-a", CategoryNodeID: &nodeA},
	}}

	gotDomains, gotNodes := FilterClientCatalogDimensions(domains, nodes, products)
	if len(gotDomains) != 1 || gotDomains[0].ID != "domain-a" {
		t.Fatalf("unexpected domains after purchasability pruning: %#v", gotDomains)
	}
	if len(gotNodes) != 1 || gotNodes[0].ID != nodeA {
		t.Fatalf("unexpected nodes after purchasability pruning: %#v", gotNodes)
	}
}
