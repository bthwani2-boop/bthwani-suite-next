import * as api from "./central-catalog.api";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  CatalogPlatformPolicy,
} from "./central-catalog.types";

export interface ControllerCoreState {
  readonly domains: readonly CentralCatalogDomain[];
  readonly nodes: readonly CentralCatalogNode[];
  readonly masterProducts: readonly MasterProduct[];
  readonly masterProductsTotal: number;
  readonly proposals: readonly ProductProposal[];
  readonly proposalsTotal: number;
  readonly policies: readonly CatalogPlatformPolicy[];
}

export class CentralCatalogControllerCore {
  private state: ControllerCoreState = {
    domains: [],
    nodes: [],
    masterProducts: [],
    masterProductsTotal: 0,
    proposals: [],
    proposalsTotal: 0,
    policies: [],
  };

  private readonly listeners = new Set<(state: ControllerCoreState) => void>();

  subscribe(listener: (state: ControllerCoreState) => void): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const frozenState = { ...this.state };
    this.listeners.forEach((l) => l(frozenState));
  }

  getState() {
    return this.state;
  }

  async loadAll() {
    const [domains, nodes, masterProductsPage, proposalsPage, policies] = await Promise.all([
      api.fetchCatalogDomains(),
      api.fetchCatalogNodes(),
      api.fetchMasterProductsPage(),
      api.fetchProductProposalsPage(),
      api.fetchCatalogPlatformPolicies(),
    ]);

    this.state = {
      domains,
      nodes,
      masterProducts: masterProductsPage.items,
      masterProductsTotal: masterProductsPage.total,
      proposals: proposalsPage.items,
      proposalsTotal: proposalsPage.total,
      policies,
    };
    this.emit();
  }
}

export const centralCatalogControllerCore = new CentralCatalogControllerCore();
