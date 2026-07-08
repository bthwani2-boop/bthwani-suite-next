import type { ClientVisibleCatalogResponse, ClientVisibleCatalogEntry } from "./central-catalog.types";

/**
 * Adapter caching and formatting client-facing catalog responses.
 */
export class ClientVisibleCatalogAdapter {
  constructor(private readonly data: ClientVisibleCatalogResponse) {}

  getDomains() {
    return this.data.domains;
  }

  getProducts() {
    return this.data.products;
  }

  getProductsByDomain(domainId: string): readonly ClientVisibleCatalogEntry[] {
    return this.data.products.filter((p) => p.domainId === domainId);
  }

  getProductsByCategory(categoryNodeId: string): readonly ClientVisibleCatalogEntry[] {
    return this.data.products.filter((p) => p.categoryNodeId === categoryNodeId);
  }
}
