import { useCallback, useEffect, useState } from "react";
import * as api from "./central-catalog.api";
import * as occApi from "./central-catalog-occ.api";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
  CatalogPlatformPolicy,
} from "./central-catalog.types";

interface CatalogVersionedEntity {
  readonly id: string;
  readonly version?: number;
}

export type CatalogDomainUpdateInput = Omit<
  Parameters<typeof occApi.updateCatalogDomainOCC>[1],
  "expectedVersion"
>;
export type CatalogNodeUpdateInput = Omit<
  Parameters<typeof occApi.updateCatalogNodeOCC>[1],
  "expectedVersion"
>;
export type CatalogMasterProductUpdateInput = Omit<
  Parameters<typeof occApi.updateMasterProductOCC>[1],
  "expectedVersion"
>;

function resolveCatalogError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { readonly message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}

function requireCatalogVersion(
  entities: readonly CatalogVersionedEntity[],
  entityId: string,
  entityKind: "domain" | "node" | "master_product" | "proposal" | "policy",
): number {
  const entity = entities.find((item) => item.id === entityId);
  if (!entity) throw new Error(`CATALOG_${entityKind.toUpperCase()}_NOT_LOADED`);
  if (!Number.isInteger(entity.version) || (entity.version ?? 0) < 1) {
    throw new Error(`CATALOG_${entityKind.toUpperCase()}_VERSION_MISSING`);
  }
  return entity.version as number;
}

async function runMutationWithReadback<T>(
  mutation: () => Promise<T>,
  readback: () => Promise<void>,
): Promise<T> {
  try {
    const result = await mutation();
    await readback();
    return result;
  } catch (error) {
    try {
      await readback();
    } catch {
      // Preserve the original mutation or conflict error after a best-effort refresh.
    }
    throw error;
  }
}

export interface CentralCatalogControllerState {
  readonly domains: {
    readonly items: readonly CentralCatalogDomain[];
    readonly loading: boolean;
    readonly error: string | null;
  };
  readonly nodes: {
    readonly items: readonly CentralCatalogNode[];
    readonly loading: boolean;
    readonly error: string | null;
  };
  readonly masterProducts: {
    readonly items: readonly MasterProduct[];
    readonly total: number;
    readonly loading: boolean;
    readonly error: string | null;
  };
  readonly proposals: {
    readonly items: readonly ProductProposal[];
    readonly total: number;
    readonly loading: boolean;
    readonly error: string | null;
  };
  readonly policies: {
    readonly items: readonly CatalogPlatformPolicy[];
    readonly loading: boolean;
    readonly error: string | null;
  };
}

export function useCentralCatalogController(authKind = "unauthenticated") {
  const [state, setState] = useState<CentralCatalogControllerState>({
    domains: { items: [], loading: false, error: null },
    nodes: { items: [], loading: false, error: null },
    masterProducts: { items: [], total: 0, loading: false, error: null },
    proposals: { items: [], total: 0, loading: false, error: null },
    policies: { items: [], loading: false, error: null },
  });

  const [assortment, setAssortment] = useState<{
    readonly items: readonly StoreAssortment[];
    readonly loading: boolean;
    readonly error: string | null;
  }>({ items: [], loading: false, error: null });

  const isAuthed = ["authenticated", "operator", "partner", "field"].includes(authKind);

  const loadDomains = useCallback(async () => {
    setState((prev) => ({ ...prev, domains: { ...prev.domains, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogDomains();
      setState((prev) => ({ ...prev, domains: { items, loading: false, error: null } }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        domains: { ...prev.domains, loading: false, error: resolveCatalogError(error, "Failed to load domains") },
      }));
    }
  }, []);

  const loadNodes = useCallback(async (domainId?: string) => {
    setState((prev) => ({ ...prev, nodes: { ...prev.nodes, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogNodes(domainId ? { domainId } : undefined);
      setState((prev) => ({ ...prev, nodes: { items, loading: false, error: null } }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        nodes: { ...prev.nodes, loading: false, error: resolveCatalogError(error, "Failed to load nodes") },
      }));
    }
  }, []);

  const loadMasterProducts = useCallback(async (query?: Parameters<typeof api.fetchMasterProductsPage>[0]) => {
    setState((prev) => ({ ...prev, masterProducts: { ...prev.masterProducts, loading: true, error: null } }));
    try {
      const { items, total } = await api.fetchMasterProductsPage(query);
      setState((prev) => ({ ...prev, masterProducts: { items, total, loading: false, error: null } }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        masterProducts: {
          ...prev.masterProducts,
          loading: false,
          error: resolveCatalogError(error, "Failed to load master products"),
        },
      }));
    }
  }, []);

  const loadProposals = useCallback(async (query?: Parameters<typeof api.fetchProductProposalsPage>[0]) => {
    setState((prev) => ({ ...prev, proposals: { ...prev.proposals, loading: true, error: null } }));
    try {
      const { items, total } = await api.fetchProductProposalsPage(query);
      setState((prev) => ({ ...prev, proposals: { items, total, loading: false, error: null } }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        proposals: { ...prev.proposals, loading: false, error: resolveCatalogError(error, "Failed to load proposals") },
      }));
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setState((prev) => ({ ...prev, policies: { ...prev.policies, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogPlatformPolicies();
      setState((prev) => ({ ...prev, policies: { items, loading: false, error: null } }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        policies: { ...prev.policies, loading: false, error: resolveCatalogError(error, "Failed to load policies") },
      }));
    }
  }, []);

  const loadStoreAssortment = useCallback(async (storeId: string) => {
    setAssortment({ items: [], loading: true, error: null });
    try {
      const items = await api.fetchOperatorStoreAssortment(storeId);
      setAssortment({ items, loading: false, error: null });
    } catch (error) {
      setAssortment({
        items: [],
        loading: false,
        error: resolveCatalogError(error, "Failed to load assortment"),
      });
    }
  }, []);

  useEffect(() => {
    if (!isAuthed) return;
    void loadDomains();
    void loadNodes();
    void loadMasterProducts();
    void loadProposals();
    void loadPolicies();
  }, [isAuthed, loadDomains, loadNodes, loadMasterProducts, loadProposals, loadPolicies]);

  return {
    state,
    assortment,
    isAuthed,
    reloadDomains: loadDomains,
    reloadNodes: loadNodes,
    reloadMasterProducts: loadMasterProducts,
    reloadProposals: loadProposals,
    reloadPolicies: loadPolicies,
    reloadStoreAssortment: loadStoreAssortment,

    createDomain: async (input: Parameters<typeof api.createCatalogDomain>[0]) =>
      runMutationWithReadback(() => api.createCatalogDomain(input), loadDomains),

    updateDomain: async (domainId: string, input: CatalogDomainUpdateInput) => {
      const expectedVersion = requireCatalogVersion(state.domains.items, domainId, "domain");
      return runMutationWithReadback(
        () => occApi.updateCatalogDomainOCC(domainId, { ...input, expectedVersion }),
        loadDomains,
      );
    },

    createNode: async (input: Parameters<typeof api.createCatalogNode>[0]) =>
      runMutationWithReadback(() => api.createCatalogNode(input), loadNodes),

    updateNode: async (nodeId: string, input: CatalogNodeUpdateInput) => {
      const expectedVersion = requireCatalogVersion(state.nodes.items, nodeId, "node");
      return runMutationWithReadback(
        () => occApi.updateCatalogNodeOCC(nodeId, { ...input, expectedVersion }),
        loadNodes,
      );
    },

    createMasterProduct: async (input: Parameters<typeof api.createMasterProduct>[0]) =>
      runMutationWithReadback(() => api.createMasterProduct(input), loadMasterProducts),

    updateMasterProduct: async (productId: string, input: CatalogMasterProductUpdateInput) => {
      const expectedVersion = requireCatalogVersion(state.masterProducts.items, productId, "master_product");
      return runMutationWithReadback(
        () => occApi.updateMasterProductOCC(productId, { ...input, expectedVersion }),
        loadMasterProducts,
      );
    },

    decideProposal: async (proposalId: string, input: Parameters<typeof api.decideProductProposal>[1]) => {
      const expectedVersion = requireCatalogVersion(state.proposals.items, proposalId, "proposal");
      return runMutationWithReadback(
        () => occApi.decideProductProposalOCC(proposalId, { ...input, expectedVersion }),
        loadProposals,
      );
    },

    transitionProposal: async (proposalId: string, input: Parameters<typeof api.transitionProductProposal>[1]) => {
      const expectedVersion = requireCatalogVersion(state.proposals.items, proposalId, "proposal");
      return runMutationWithReadback(
        () => occApi.transitionProductProposalOCC(proposalId, { ...input, expectedVersion }),
        loadProposals,
      );
    },

    updatePolicy: async (policyId: string, input: Parameters<typeof api.updateCatalogPlatformPolicy>[1]) => {
      const expectedVersion = requireCatalogVersion(state.policies.items, policyId, "policy");
      return runMutationWithReadback(
        () => occApi.updateCatalogPlatformPolicyOCC(policyId, { ...input, expectedVersion }),
        loadPolicies,
      );
    },

    upsertAssortment: async (
      storeId: string,
      masterProductId: string,
      input: Parameters<typeof api.upsertOperatorStoreAssortment>[2],
    ) => {
      const current = assortment.items.find((item) => item.masterProductId === masterProductId);
      return runMutationWithReadback(
        () => occApi.upsertOperatorStoreAssortmentOCC(storeId, masterProductId, {
          ...input,
          expectedVersion: current?.version,
        }),
        () => loadStoreAssortment(storeId),
      );
    },
  };
}
