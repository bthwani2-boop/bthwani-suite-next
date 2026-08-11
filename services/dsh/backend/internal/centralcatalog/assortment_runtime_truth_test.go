package centralcatalog

import "testing"

func TestAssortmentTruthPurchasable(t *testing.T) {
	tests := []struct {
		name  string
		truth assortmentRuntimeTruth
		want  bool
	}{
		{
			name: "signal with effective price and stock",
			truth: assortmentRuntimeTruth{AmountMinor: 1250, Currency: "YER", PolicyType: "signal", Quantity: 5, MinOrderQuantity: 1, MaxOrderQuantity: 100, StepQuantity: 1},
			want: true,
		},
		{
			name: "missing price fails closed",
			truth: assortmentRuntimeTruth{Currency: "YER", PolicyType: "signal", Quantity: 5, MinOrderQuantity: 1, MaxOrderQuantity: 100, StepQuantity: 1},
			want: false,
		},
		{
			name: "depleted quantity policy fails closed",
			truth: assortmentRuntimeTruth{AmountMinor: 1250, Currency: "YER", PolicyType: "quantity", Quantity: 4, ReservedQuantity: 4, MinOrderQuantity: 1, MaxOrderQuantity: 10, StepQuantity: 1},
			want: false,
		},
		{
			name: "quantity policy must satisfy minimum order",
			truth: assortmentRuntimeTruth{AmountMinor: 1250, Currency: "YER", PolicyType: "quantity", Quantity: 2, MinOrderQuantity: 3, MaxOrderQuantity: 10, StepQuantity: 1},
			want: false,
		},
		{
			name: "infinite policy is purchasable without signal quantity",
			truth: assortmentRuntimeTruth{AmountMinor: 1250, Currency: "YER", PolicyType: "infinite", MinOrderQuantity: 1, MaxOrderQuantity: 100, StepQuantity: 1},
			want: true,
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
