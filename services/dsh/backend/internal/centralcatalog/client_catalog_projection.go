package centralcatalog

// FilterClientCatalogDimensions removes domain/node rows that no longer own a
// purchasable product after the normalized runtime gate. This prevents phantom
// client categories when a legacy client_visible assortment is filtered out
// because its price or inventory truth is not currently purchasable.
func FilterClientCatalogDimensions(domains []Domain, nodes []Node, products []ClientCatalogEntry) ([]Domain, []Node) {
	domainIDs := make(map[string]struct{}, len(products))
	nodeIDs := make(map[string]struct{}, len(products))
	for _, product := range products {
		domainIDs[product.DomainID] = struct{}{}
		if product.CategoryNodeID != nil {
			nodeIDs[*product.CategoryNodeID] = struct{}{}
		}
	}

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
