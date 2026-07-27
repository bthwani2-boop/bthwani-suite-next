// Field catalog controller — lets a field agent stock a partner's draft store
// from the sovereign central catalog. Store-local truth is limited to price,
// availability, stock, note, and governed media; product identity remains central.
import { useCallback, useEffect, useState } from "react";
import { fieldGetPartnerStore } from "./partner.api";
import {
  fetchFieldTaxonomy,
  fetchFieldMasterProducts,
  fetchFieldStoreAssortment,
  createFieldProductProposal,
} from "../catalog/central-catalog.api";
import { fetchFieldProductProposals } from "../catalog/product-proposal-readback.api";
import {
  upsertFieldStoreAssortmentOCC,
  upsertFieldStoreAssortmentBatchOCC,
  type FieldStoreAssortmentBatchResult,
} from "../catalog/central-catalog-occ.api";
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

export type FieldStoreAssortmentBatchInput = {
  readonly masterProductId: string;
  readonly input: FieldStoreAssortmentInput;
};

export type FieldCatalogBatchSummary = {
  readonly succeeded: number;
  readonly failed: number;
  readonly results: readonly FieldStoreAssortmentBatchResult[];
};

export type FieldProductProposalInput = {
  readonly proposedNameAr: string;
  readonly proposedNameEn: string;
  readonly domainId: string;
  readonly categoryNodeId: string | null;
  readonly brand: string;
  readonly barcode: string | null;
  readonly imageObjectKey?: string | null;
};

function mergeSavedAssortments(
  current: readonly StoreAssortment[],
  results: readonly FieldStoreAssortmentBatchResult[],
): readonly StoreAssortment[] {
  const saved = results.flatMap((result) => result.status === "saved" && result.assortment ? [result.assortment] : []);
  if (saved.length === 0) return current;
  const savedIds = new Set(saved.map((item) => item.masterProductId));
  return [...current.filter((item) => !savedIds.has(item.masterProductId)), ...saved];
}

export function useFieldCatalogController(partnerId: string) {
  const [storeState, setStoreState] = useState<FieldCatalogStoreState>({ kind: "idle" });
  const [taxonomyState, setTaxonomyState] = useState<FieldCatalogTaxonomyState>({ kind: "idle" });
  const [masterProductsState, setMasterProductsState] = useState<FieldCatalogMasterProductsState>({ kind: "idle" });
  const [actionState, setActionState] = useState<FieldCatalogActionState>({ kind: "idle" });

  const [assortmentItems, setAssortmentItems] = useState<readonly StoreAssortment[]>([]);
  const [proposals, setProposals] = useState<readonly ProductProposal[]>([]);

  const loadStore = useCallback(async () => {
    if (!partnerId) return;
    setStoreState({ kind: "loading" });
    try {
      const [{ storeId, store }, currentAssortment, proposalPage] = await Promise.all([
        fieldGetPartnerStore(partnerId),
        fetchFieldStoreAssortment(partnerId),
        fetchFieldProductProposals(partnerId, { limit: 100, offset: 0 }),
      ]);
      if (currentAssortment.storeId !== storeId) {
        throw new Error("field catalog store scope mismatch");
      }
      setAssortmentItems(currentAssortment.assortment);
      setProposals(proposalPage.items);
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
        const items = await fetchFieldMasterProducts({ ...query, limit: 100, offset: 0 });
        setMasterProductsState({ kind: "success", items });
      } catch {
        setMasterProductsState({ kind: "error", message: "تعذر تحميل المنتجات" });
      }
    },
    [],
  );

  useEffect(() => { void loadStore(); }, [loadStore]);
  useEffect(() => { void loadTaxonomy(); }, [loadTaxonomy]);

  const linkMasterProduct = useCallback(
    async (masterProductId: string, input: FieldStoreAssortmentInput): Promise<boolean> => {
      if (storeState.kind !== "success") return false;
      setActionState({ kind: "submitting" });
      try {
        const existing = assortmentItems.find((item) => item.masterProductId === masterProductId);
        const assortment = await upsertFieldStoreAssortmentOCC(partnerId, storeState.storeId, masterProductId, {
          unitPrice: input.unitPrice,
          currency: input.currency,
          available: input.available,
          stockStatus: input.stockStatus,
          localNote: input.localNote,
          customImageObjectKey: null,
          publicationStatus: existing?.publicationStatus ?? "draft",
          ...(existing ? { expectedVersion: existing.version } : {}),
        });
        setAssortmentItems((previous) => {
          const withoutExisting = previous.filter((item) => item.masterProductId !== masterProductId);
          return [...withoutExisting, assortment];
        });
        setActionState({ kind: "idle" });
        return true;
      } catch {
        await loadStore();
        setActionState({ kind: "error", message: "تعذر ربط المنتج بالمتجر" });
        return false;
      }
    },
    [partnerId, storeState, assortmentItems, loadStore],
  );

  const linkMasterProductsBatch = useCallback(
    async (items: readonly FieldStoreAssortmentBatchInput[]): Promise<FieldCatalogBatchSummary> => {
      if (storeState.kind !== "success" || items.length === 0) {
        return { succeeded: 0, failed: items.length, results: [] };
      }
      setActionState({ kind: "submitting" });
      try {
        const response = await upsertFieldStoreAssortmentBatchOCC(
          partnerId,
          storeState.storeId,
          items.map(({ masterProductId, input }) => {
            const existing = assortmentItems.find((item) => item.masterProductId === masterProductId);
            return {
              masterProductId,
              unitPrice: input.unitPrice,
              currency: input.currency,
              available: input.available,
              stockStatus: input.stockStatus,
              localNote: input.localNote,
              customImageObjectKey: null,
              publicationStatus: existing?.publicationStatus ?? "draft",
              ...(existing ? { expectedVersion: existing.version } : {}),
            };
          }),
        );
        setAssortmentItems((previous) => mergeSavedAssortments(previous, response.results));
        if (response.failed > 0) {
          await loadStore();
          setActionState({ kind: "error", message: `تم حفظ ${response.succeeded} وتعذر حفظ ${response.failed}` });
        } else {
          setActionState({ kind: "idle" });
        }
        return response;
      } catch {
        await loadStore();
        setActionState({ kind: "error", message: "تعذر حفظ مجموعة المنتجات" });
        return { succeeded: 0, failed: items.length, results: [] };
      }
    },
    [partnerId, storeState, assortmentItems, loadStore],
  );

  const proposeNewProduct = useCallback(
    async (input: FieldProductProposalInput): Promise<ProductProposal | null> => {
      setActionState({ kind: "submitting" });
      try {
        const proposal = await createFieldProductProposal(partnerId, {
          proposedNameAr: input.proposedNameAr,
          proposedNameEn: input.proposedNameEn,
          domainId: input.domainId,
          categoryNodeId: input.categoryNodeId,
          brand: input.brand,
          barcode: input.barcode,
          imageObjectKey: input.imageObjectKey || null,
          sourceSurface: "app-field",
        });
        setProposals((previous) => [proposal, ...previous.filter((item) => item.id !== proposal.id)]);
        setActionState({ kind: "idle" });
        return proposal;
      } catch {
        setActionState({ kind: "error", message: "تعذر إرسال اقتراح المنتج" });
        return null;
      }
    },
    [partnerId],
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
    linkMasterProductsBatch,
    proposeNewProduct,
  };
}
