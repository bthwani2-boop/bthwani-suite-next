import { useCallback, useEffect, useState } from "react";
import * as api from "./central-catalog.api";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  ProductProposal,
  StoreAssortment,
  CatalogPlatformPolicy,
} from "./central-catalog.types";

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
    readonly loading: boolean;
    readonly error: string | null;
  };
  readonly proposals: {
    readonly items: readonly ProductProposal[];
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
    masterProducts: { items: [], loading: false, error: null },
    proposals: { items: [], loading: false, error: null },
    policies: { items: [], loading: false, error: null },
  });

  const [assortment, setAssortment] = useState<{
    readonly items: readonly StoreAssortment[];
    readonly loading: boolean;
    readonly error: string | null;
  }>({ items: [], loading: false, error: null });

  const isAuthed = authKind === "authenticated" || authKind === "operator" || authKind === "partner" || authKind === "field";

  const loadDomains = useCallback(async () => {
    setState((prev) => ({ ...prev, domains: { ...prev.domains, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogDomains();
      setState((prev) => ({ ...prev, domains: { items, loading: false, error: null } }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, domains: { ...prev.domains, loading: false, error: err.message ?? "Failed to load domains" } }));
    }
  }, []);

  const loadNodes = useCallback(async (domainId?: string) => {
    setState((prev) => ({ ...prev, nodes: { ...prev.nodes, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogNodes(domainId ? { domainId } : undefined);
      setState((prev) => ({ ...prev, nodes: { items, loading: false, error: null } }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, nodes: { ...prev.nodes, loading: false, error: err.message ?? "Failed to load nodes" } }));
    }
  }, []);

  const loadMasterProducts = useCallback(async (query?: Parameters<typeof api.fetchMasterProducts>[0]) => {
    setState((prev) => ({ ...prev, masterProducts: { ...prev.masterProducts, loading: true, error: null } }));
    try {
      const items = await api.fetchMasterProducts(query);
      setState((prev) => ({ ...prev, masterProducts: { items, loading: false, error: null } }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, masterProducts: { ...prev.masterProducts, loading: false, error: err.message ?? "Failed to load master products" } }));
    }
  }, []);

  const loadProposals = useCallback(async (query?: Parameters<typeof api.fetchProductProposals>[0]) => {
    setState((prev) => ({ ...prev, proposals: { ...prev.proposals, loading: true, error: null } }));
    try {
      const items = await api.fetchProductProposals(query);
      setState((prev) => ({ ...prev, proposals: { items, loading: false, error: null } }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, proposals: { ...prev.proposals, loading: false, error: err.message ?? "Failed to load proposals" } }));
    }
  }, []);

  const loadPolicies = useCallback(async () => {
    setState((prev) => ({ ...prev, policies: { ...prev.policies, loading: true, error: null } }));
    try {
      const items = await api.fetchCatalogPlatformPolicies();
      setState((prev) => ({ ...prev, policies: { items, loading: false, error: null } }));
    } catch (err: any) {
      setState((prev) => ({ ...prev, policies: { ...prev.policies, loading: false, error: err.message ?? "Failed to load policies" } }));
    }
  }, []);

  const loadStoreAssortment = useCallback(async (storeId: string) => {
    setAssortment({ items: [], loading: true, error: null });
    try {
      const items = await api.fetchOperatorStoreAssortment(storeId);
      setAssortment({ items, loading: false, error: null });
    } catch (err: any) {
      setAssortment({ items: [], loading: false, error: err.message ?? "Failed to load assortment" });
    }
  }, []);

  useEffect(() => {
    if (isAuthed) {
      void loadDomains();
      void loadNodes();
      void loadMasterProducts();
      void loadProposals();
      void loadPolicies();
    }
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

    // Mutations for domains
    createDomain: async (input: Parameters<typeof api.createCatalogDomain>[0]) => {
      const res = await api.createCatalogDomain(input);
      void loadDomains();
      return res;
    },
    updateDomain: async (domainId: string, input: Parameters<typeof api.updateCatalogDomain>[1]) => {
      const res = await api.updateCatalogDomain(domainId, input);
      void loadDomains();
      return res;
    },

    // Mutations for nodes
    createNode: async (input: Parameters<typeof api.createCatalogNode>[0]) => {
      const res = await api.createCatalogNode(input);
      void loadNodes();
      return res;
    },
    updateNode: async (nodeId: string, input: Parameters<typeof api.updateCatalogNode>[1]) => {
      const res = await api.updateCatalogNode(nodeId, input);
      void loadNodes();
      return res;
    },

    // Mutations for master products
    createMasterProduct: async (input: Parameters<typeof api.createMasterProduct>[0]) => {
      const res = await api.createMasterProduct(input);
      void loadMasterProducts();
      return res;
    },
    updateMasterProduct: async (productId: string, input: Parameters<typeof api.updateMasterProduct>[1]) => {
      const res = await api.updateMasterProduct(productId, input);
      void loadMasterProducts();
      return res;
    },

    decideProposal: async (proposalId: string, input: Parameters<typeof api.decideProductProposal>[1]) => {
      const res = await api.decideProductProposal(proposalId, input);
      void loadProposals();
      return res;
    },
    transitionProposal: async (proposalId: string, input: Parameters<typeof api.transitionProductProposal>[1]) => {
      const res = await api.transitionProductProposal(proposalId, input);
      void loadProposals();
      return res;
    },

    // Policies
    updatePolicy: async (policyId: string, input: Parameters<typeof api.updateCatalogPlatformPolicy>[1]) => {
      const res = await api.updateCatalogPlatformPolicy(policyId, input);
      void loadPolicies();
      return res;
    },

    // Assortments
    upsertAssortment: async (storeId: string, masterProductId: string, input: Parameters<typeof api.upsertOperatorStoreAssortment>[2]) => {
      const res = await api.upsertOperatorStoreAssortment(storeId, masterProductId, input);
      void loadStoreAssortment(storeId);
      return res;
    },
  };
}
