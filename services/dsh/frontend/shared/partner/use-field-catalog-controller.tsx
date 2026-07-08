// Field catalog controller — lets a field agent, while onboarding a partner's
// auto-created draft store, browse the sovereign central-catalog master
// products (never free-form local products) and link a chosen one to the
// store's assortment, or propose a brand-new master product for review when
// nothing matching exists. Proposals go through the approval pipeline before
// they can ever be linked to a store — this controller never links a
// proposal id, only an adopted masterProductId.
import { useCallback, useEffect, useState } from "react";
import { fieldGetPartnerStore } from "./partner.api";
import {
  fetchFieldTaxonomy,
  fetchFieldMasterProducts,
  upsertFieldStoreAssortment,
  createFieldProductProposal,
} from "../catalog/central-catalog.api";
import type {
  CentralCatalogDomain,
  CentralCatalogNode,
  MasterProduct,
  StoreAssortment,
  ProductProposal,
} from "../catalog/central-catalog.types";
import type { DshFieldPartnerStoreDraft } from "./partner.types";

export type FieldCatalogStoreState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly storeId: string; readonly store: DshFieldPartnerStoreDraft }
  | { readonly kind: "error"; readonly message: string };

export type FieldCatalogTaxonomyState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly domains: readonly CentralCatalogDomain[]; readonly nodes: readonly CentralCatalogNode[] }
  | { readonly kind: "error"; readonly message: string };

export type FieldCatalogMasterProductsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly MasterProduct[] }
  | { readonly kind: "error"; readonly message: string };

export type FieldCatalogActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | { readonly kind: "error"; readonly message: string };

export type FieldStoreAssortmentInput = {
  readonly unitPrice: number;
  readonly currency: string;
  readonly available: boolean;
  readonly stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  readonly localNote: string;
};

export type FieldProductProposalInput = {
  readonly proposedNameAr: string;
  readonly proposedNameEn: string;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly brand: string;
  readonly barcode: string | null;
};

export function useFieldCatalogController(partnerId: string) {
  const [storeState, setStoreState] = useState<FieldCatalogStoreState>({ kind: "idle" });
  const [taxonomyState, setTaxonomyState] = useState<FieldCatalogTaxonomyState>({ kind: "idle" });
  const [masterProductsState, setMasterProductsState] = useState<FieldCatalogMasterProductsState>({ kind: "idle" });
  const [actionState, setActionState] = useState<FieldCatalogActionState>({ kind: "idle" });

  // No field-surface GET route exists for store assortment (only the field
  // upsert route does — confirmed against server.go), so the "current
  // assortment" list is built up client-side from successful links made in
  // this session rather than re-fetched from the server.
  const [assortmentItems, setAssortmentItems] = useState<readonly StoreAssortment[]>([]);
  const [proposals, setProposals] = useState<readonly ProductProposal[]>([]);

  const loadStore = useCallback(async () => {
    if (!partnerId) return;
    setStoreState({ kind: "loading" });
    try {
      const { storeId, store } = await fieldGetPartnerStore(partnerId);
      setStoreState({ kind: "success", storeId, store });
    } catch {
      setStoreState({ kind: "error", message: "تعذر تحميل متجر الشريك" });
    }
  }, [partnerId]);

  const loadTaxonomy = useCallback(async () => {
    setTaxonomyState({ kind: "loading" });
    try {
      const { domains, nodes } = await fetchFieldTaxonomy();
      setTaxonomyState({ kind: "success", domains, nodes });
    } catch {
      setTaxonomyState({ kind: "error", message: "تعذر تحميل تصنيفات الكتالوج" });
    }
  }, []);

  const searchMasterProducts = useCallback(
    async (query?: { domainId?: string; categoryNodeId?: string; search?: string }) => {
      setMasterProductsState({ kind: "loading" });
      try {
        const items = await fetchFieldMasterProducts(query);
        setMasterProductsState({ kind: "success", items });
      } catch {
        setMasterProductsState({ kind: "error", message: "تعذر تحميل المنتجات" });
      }
    },
    []
  );

  useEffect(() => { void loadStore(); }, [loadStore]);
  useEffect(() => { void loadTaxonomy(); }, [loadTaxonomy]);

  const linkMasterProduct = useCallback(
    async (masterProductId: string, input: FieldStoreAssortmentInput): Promise<boolean> => {
      if (storeState.kind !== "success") return false;
      setActionState({ kind: "submitting" });
      try {
        const existing = assortmentItems.find((a) => a.masterProductId === masterProductId);
        const assortment = await upsertFieldStoreAssortment(partnerId, storeState.storeId, masterProductId, {
          unitPrice: input.unitPrice,
          currency: input.currency,
          available: input.available,
          stockStatus: input.stockStatus,
          localNote: input.localNote,
          customImageObjectKey: null,
          publicationStatus: existing?.publicationStatus ?? "draft",
        });
        setAssortmentItems((prev) => {
          const withoutExisting = prev.filter((a) => a.masterProductId !== masterProductId);
          return [...withoutExisting, assortment];
        });
        setActionState({ kind: "idle" });
        return true;
      } catch {
        setActionState({ kind: "error", message: "تعذر ربط المنتج بالمتجر" });
        return false;
      }
    },
    [partnerId, storeState, assortmentItems]
  );

  const proposeNewProduct = useCallback(
    async (input: FieldProductProposalInput): Promise<ProductProposal | null> => {
      setActionState({ kind: "submitting" });
      try {
        const proposal = await createFieldProductProposal({
          proposedNameAr: input.proposedNameAr,
          proposedNameEn: input.proposedNameEn,
          domainId: input.domainId,
          categoryNodeId: input.categoryNodeId,
          brand: input.brand,
          barcode: input.barcode,
          imageObjectKey: null,
          sourceSurface: "app-field",
        });
        setProposals((prev) => [proposal, ...prev]);
        setActionState({ kind: "idle" });
        return proposal;
      } catch {
        setActionState({ kind: "error", message: "تعذر إرسال اقتراح المنتج" });
        return null;
      }
    },
    []
  );

  return {
    storeState,
    taxonomyState,
    masterProductsState,
    actionState,
    assortmentItems,
    proposals,
    reloadStore: loadStore,
    reloadTaxonomy: loadTaxonomy,
    searchMasterProducts,
    linkMasterProduct,
    proposeNewProduct,
  };
}
