package centralcatalog

// FilterClientCatalogDimensions removes domain/node rows that no longer own a
// purchasable product after the normalized runtime gate. This prevents phantom
// client categories when a legacy client_visible assortment is filtered out
// because its price or inventory truth is not currently purchasable.
func FilterClientCatalogDimensions(domains []Domain, nodes []Node, products []ClientCatalogEntry) ([]Domain, []Node) {
	domainIDs, nodeIDs, _, _ := clientCatalogEntityIDs(products)

	filteredDomains := make([]Domain, 0, len(domainIDs))
	for _, domain := range domains {
		if _, ok := domainIDs[domain.ID]; ok {
			filteredDomains = append(filteredDomains, domain)
		}
	}

	filteredNodes := make([]Node, 0, len(nodeIDs))
	for _, node := range nodes {
		if _, ok := nodeIDs[node.ID]; ok {
			filteredNodes = append(filteredNodes, node)
		}
	}
	return filteredDomains, filteredNodes
}

func clientCatalogEntityIDs(products []ClientCatalogEntry) (
	map[string]struct{},
	map[string]struct{},
	map[string]struct{},
	map[string]struct{},
) {
	domainIDs := make(map[string]struct{}, len(products))
	nodeIDs := make(map[string]struct{}, len(products))
	productIDs := make(map[string]struct{}, len(products))
	assortmentIDs := make(map[string]struct{}, len(products))
	for _, product := range products {
		domainIDs[product.DomainID] = struct{}{}
		productIDs[product.ID] = struct{}{}
		if product.CategoryNodeID != nil {
			nodeIDs[*product.CategoryNodeID] = struct{}{}
		}
		if product.assortmentID != "" {
			assortmentIDs[product.assortmentID] = struct{}{}
		}
	}
	return domainIDs, nodeIDs, productIDs, assortmentIDs
}

// FilterClientCatalogAuxiliaryProjection removes media and scoped policies
// whose target was discarded by the final normalized purchasability gate.
// The response therefore has one coherent graph: every non-default policy and
// every returned media link belongs to a domain/node/product/assortment that
// is actually present in the final client catalog.
func FilterClientCatalogAuxiliaryProjection(
	media []CatalogAssetLinkWithAsset,
	policies []CatalogPolicy,
	products []ClientCatalogEntry,
) ([]CatalogAssetLinkWithAsset, []CatalogPolicy) {
	domainIDs, nodeIDs, productIDs, assortmentIDs := clientCatalogEntityIDs(products)

	filteredMedia := make([]CatalogAssetLinkWithAsset, 0, len(media))
	for _, link := range media {
		keep := false
		switch link.EntityType {
		case "domain":
			_, keep = domainIDs[link.EntityID]
		case "node":
			_, keep = nodeIDs[link.EntityID]
		case "master_product":
			_, keep = productIDs[link.EntityID]
		case "store_assortment":
			_, keep = assortmentIDs[link.EntityID]
		}
		if keep {
			filteredMedia = append(filteredMedia, link)
		}
	}

	filteredPolicies := make([]CatalogPolicy, 0, len(policies))
	for _, policy := range policies {
		if !policy.IsActive {
			continue
		}
		keep := false
		switch policy.PolicyScope {
		case "default":
			keep = true
		case "domain":
			if policy.DomainID != nil {
				_, keep = domainIDs[*policy.DomainID]
			}
		case "node":
			if policy.NodeID != nil {
				_, keep = nodeIDs[*policy.NodeID]
			}
		}
		if keep {
			filteredPolicies = append(filteredPolicies, policy)
		}
	}

	return filteredMedia, filteredPolicies
}
