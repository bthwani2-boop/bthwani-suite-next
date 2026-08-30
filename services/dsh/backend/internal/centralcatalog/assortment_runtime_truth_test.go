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
			name: "paused assortment fails closed",
			truth: assortmentRuntimeTruth{
				AmountMinor: 1250,
				Currency:    "YER",
				Paused:      true,
				assortmentInventoryTruth: assortmentInventoryTruth{
					PolicyType: "signal", Quantity: 5, MinOrderQuantity: 1, MaxOrderQuantity: 100, StepQuantity: 1,
				},
			},
			want: false,
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
		assortmentID:  "assortment-a",
	}}

	gotDomains, gotNodes := FilterClientCatalogDimensions(domains, nodes, products)
	if len(gotDomains) != 1 || gotDomains[0].ID != "domain-a" {
		t.Fatalf("unexpected domains after purchasability pruning: %#v", gotDomains)
	}
	if len(gotNodes) != 1 || gotNodes[0].ID != nodeA {
		t.Fatalf("unexpected nodes after purchasability pruning: %#v", gotNodes)
	}
}

func TestFilterClientCatalogAuxiliaryProjectionRemovesOrphans(t *testing.T) {
	nodeA := "node-a"
	nodeB := "node-b"
	domainA := "domain-a"
	domainB := "domain-b"
	products := []ClientCatalogEntry{{
		MasterProduct: MasterProduct{ID: "product-a", DomainID: domainA, CategoryNodeID: &nodeA},
		assortmentID:  "assortment-a",
	}}
	media := []CatalogAssetLinkWithAsset{
		{CatalogAssetLink: CatalogAssetLink{ID: "m-domain-a", EntityType: "domain", EntityID: domainA}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-domain-b", EntityType: "domain", EntityID: domainB}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-node-a", EntityType: "node", EntityID: nodeA}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-node-b", EntityType: "node", EntityID: nodeB}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-product-a", EntityType: "master_product", EntityID: "product-a"}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-product-b", EntityType: "master_product", EntityID: "product-b"}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-assortment-a", EntityType: "store_assortment", EntityID: "assortment-a"}},
		{CatalogAssetLink: CatalogAssetLink{ID: "m-assortment-b", EntityType: "store_assortment", EntityID: "assortment-b"}},
	}
	policies := []CatalogPolicy{
		{ID: "default", PolicyScope: "default", IsActive: true},
		{ID: "domain-a", PolicyScope: "domain", DomainID: &domainA, IsActive: true},
		{ID: "domain-b", PolicyScope: "domain", DomainID: &domainB, IsActive: true},
		{ID: "node-a", PolicyScope: "node", NodeID: &nodeA, IsActive: true},
		{ID: "node-b", PolicyScope: "node", NodeID: &nodeB, IsActive: true},
		{ID: "inactive", PolicyScope: "default", IsActive: false},
	}

	gotMedia, gotPolicies := FilterClientCatalogAuxiliaryProjection(media, policies, products)
	if len(gotMedia) != 4 {
		t.Fatalf("expected exactly 4 media links for the surviving catalog graph, got %#v", gotMedia)
	}
	for _, link := range gotMedia {
		if link.EntityID == domainB || link.EntityID == nodeB || link.EntityID == "product-b" || link.EntityID == "assortment-b" {
			t.Fatalf("orphan media survived final catalog projection: %#v", link)
		}
	}
	if len(gotPolicies) != 3 {
		t.Fatalf("expected default + surviving domain/node policies, got %#v", gotPolicies)
	}
	for _, policy := range gotPolicies {
		if policy.ID == "domain-b" || policy.ID == "node-b" || policy.ID == "inactive" {
			t.Fatalf("orphan/inactive policy survived final catalog projection: %#v", policy)
		}
	}
}
