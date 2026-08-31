// Field catalog controller — lets a field agent stock a partner's draft store
// from the sovereign central catalog. Store-local truth is limited to price,
// availability, stock, note, and governed media; product identity remains central.
import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyGovernedError,
  type GovernedProblem,
} from "../_kernel/governed-problem";
import { fieldGetPartnerStore } from "./partner.api";
import { corrId } from "../_kernel/dsh-http-request";
import {
  fetchFieldTaxonomy,
  fetchFieldMasterProducts,
  fetchFieldStoreAssortment,
  fetchFieldProductProposals,
  createFieldProductProposal,
  withdrawFieldProductProposal,
} from "../catalog/central-catalog.api";
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
  StoreAssortmentCommercialReadback,
  ProductProposal,
} from "../catalog/central-catalog.types";
import type { DshFieldPartnerStoreDraft } from "./partner.types";

/**
 * Catalog failures keep their catalog-specific sentence but must still carry
 * the governed reason code, allowed next action, retry semantics, and support
 * reference so the field screen can act on them.
 */
export type FieldCatalogErrorState = {
  readonly kind: "error";
  readonly message: string;
  readonly problem: GovernedProblem;
};

function fieldCatalogErrorState(error: unknown, fallback: string): FieldCatalogErrorState {
  const problem = classifyGovernedError(error);
  // Prefer the server's own sentence when it sent one; otherwise use the
  // catalog-specific fallback rather than a generic transport message.
  const message = problem.serverMessage ?? fallback;
  return { kind: "error", message, problem: { ...problem, message } };
}

export type FieldCatalogStoreState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly storeId: string; readonly store: DshFieldPartnerStoreDraft }
  | FieldCatalogErrorState;

export type FieldCatalogTaxonomyState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly domains: readonly CentralCatalogDomain[]; readonly nodes: readonly CentralCatalogNode[] }
  | FieldCatalogErrorState;

export type FieldCatalogMasterProductsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly items: readonly MasterProduct[] }
  | FieldCatalogErrorState;

export type FieldCatalogActionState =
  | { readonly kind: "idle" }
  | { readonly kind: "submitting" }
  | FieldCatalogErrorState;

export type FieldStoreAssortmentInput = {
  readonly price: number;
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
  readonly targetMasterProductId?: string;
  readonly baseVersion?: number;
};

function quantityForStockStatus(status: FieldStoreAssortmentInput["stockStatus"]): number {
  if (status === "out_of_stock") return 0;
  if (status === "low_stock") return 5;
  return 100;
}

function buildNormalizedInventory(status: FieldStoreAssortmentInput["stockStatus"], expectedVersion: number) {
  return {
    policyType: "signal" as const,
    quantity: quantityForStockStatus(status),
    minOrderQuantity: 1,
    maxOrderQuantity: 100,
    stepQuantity: 1,
    expectedVersion,
  };
}

function buildNormalizedPrice(price: number) {
  return {
    amountMinor: Math.round(price * 100),
    currency: "YER",
    prepTimeMin: 15,
    prepTimeMax: 30,
    effectiveFrom: new Date().toISOString(),
    effectiveUntil: null,
  };
}

export function useFieldCatalogController(partnerId: string) {
  const [storeState, setStoreState] = useState<FieldCatalogStoreState>({ kind: "idle" });
  const [taxonomyState, setTaxonomyState] = useState<FieldCatalogTaxonomyState>({ kind: "idle" });
  const [masterProductsState, setMasterProductsState] = useState<FieldCatalogMasterProductsState>({ kind: "idle" });
  const [actionState, setActionState] = useState<FieldCatalogActionState>({ kind: "idle" });

  const [assortmentItems, setAssortmentItems] = useState<readonly StoreAssortment[]>([]);
  const [assortmentCommercial, setAssortmentCommercial] = useState<ReadonlyMap<string, StoreAssortmentCommercialReadback>>(new Map());
  const [proposals, setProposals] = useState<readonly ProductProposal[]>([]);
  const proposalMutationRef = useRef<{ key: string; fingerprint: string } | null>(null);

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
      setAssortmentCommercial(currentAssortment.commercial);
      setProposals(proposalPage.items);
      setStoreState({ kind: "success", storeId, store });
    } catch (error) {
      setStoreState(fieldCatalogErrorState(error, "تعذر تحميل متجر الشريك"));
    }
  }, [partnerId]);

  const loadTaxonomy = useCallback(async () => {
    setTaxonomyState({ kind: "loading" });
    try {
      const { domains, nodes } = await fetchFieldTaxonomy();
      setTaxonomyState({ kind: "success", domains, nodes });
    } catch (error) {
      setTaxonomyState(fieldCatalogErrorState(error, "تعذر تحميل تصنيفات الكتالوج"));
    }
  }, []);

  const searchMasterProducts = useCallback(
    async (query?: { domainId?: string; categoryNodeId?: string; search?: string }) => {
      setMasterProductsState({ kind: "loading" });
      try {
        const items = await fetchFieldMasterProducts({ ...query, limit: 100, offset: 0 });
        setMasterProductsState({ kind: "success", items });
      } catch (error) {
        setMasterProductsState(fieldCatalogErrorState(error, "تعذر تحميل المنتجات"));
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
        const currentCommercial = assortmentCommercial.get(masterProductId);
        const assortment = await upsertFieldStoreAssortmentOCC(partnerId, storeState.storeId, masterProductId, {
          localNote: input.localNote,
          customImageObjectKey: null,
          publicationStatus: existing?.publicationStatus ?? "draft",
          inventory: buildNormalizedInventory(input.stockStatus, currentCommercial?.inventory.version ?? 0),
          price: buildNormalizedPrice(input.price),
          ...(existing ? { expectedVersion: existing.version } : {}),
        });
        setAssortmentItems((previous) => {
          const withoutExisting = previous.filter((item) => item.masterProductId !== masterProductId);
          return [...withoutExisting, assortment];
        });
        await loadStore();
        setActionState({ kind: "idle" });
        return true;
      } catch (error) {
        await loadStore();
        setActionState(fieldCatalogErrorState(error, "تعذر ربط المنتج بالمتجر"));
        return false;
      }
    },
    [partnerId, storeState, assortmentItems, assortmentCommercial, loadStore],
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
            const currentCommercial = assortmentCommercial.get(masterProductId);
            return {
              masterProductId,
              localNote: input.localNote,
              customImageObjectKey: null,
              publicationStatus: existing?.publicationStatus ?? "draft",
              inventory: buildNormalizedInventory(input.stockStatus, currentCommercial?.inventory.version ?? 0),
              price: buildNormalizedPrice(input.price),
              ...(existing ? { expectedVersion: existing.version } : {}),
            };
          }),
        );
        await loadStore();
        if (response.failed > 0) {
          await loadStore();
          // Partial batch failure is a distinct outcome, not a transport error:
          // some rows persisted and the screen must say which and offer a
          // targeted retry rather than resubmitting everything blindly.
          setActionState(
            fieldCatalogErrorState(
              { code: "PARTIAL_BATCH_FAILURE" },
              `تم حفظ ${response.succeeded} وتعذر حفظ ${response.failed}. راجع العناصر غير المحفوظة ثم أعد إرسالها وحدها.`,
            ),
          );
        } else {
          setActionState({ kind: "idle" });
        }
        return response;
      } catch (error) {
        await loadStore();
        setActionState(fieldCatalogErrorState(error, "تعذر حفظ مجموعة المنتجات"));
        return { succeeded: 0, failed: items.length, results: [] };
      }
    },
    [partnerId, storeState, assortmentItems, assortmentCommercial, loadStore],
  );

  const proposeNewProduct = useCallback(
    async (input: FieldProductProposalInput): Promise<ProductProposal | null> => {
      setActionState({ kind: "submitting" });
      try {
        const fingerprint = JSON.stringify({ partnerId, input });
        const previous = proposalMutationRef.current;
        const idempotencyKey = previous?.fingerprint === fingerprint
          ? previous.key
          : corrId("catalog-field-proposal-create");
        proposalMutationRef.current = { key: idempotencyKey, fingerprint };
        const proposal = await createFieldProductProposal(partnerId, {
          proposedNameAr: input.proposedNameAr,
          proposedNameEn: input.proposedNameEn,
          domainId: input.domainId,
          categoryNodeId: input.categoryNodeId,
          brand: input.brand,
          barcode: input.barcode,
          imageObjectKey: input.imageObjectKey || null,
          ...(input.targetMasterProductId !== undefined ? { targetMasterProductId: input.targetMasterProductId } : {}),
          ...(input.baseVersion !== undefined ? { baseVersion: input.baseVersion } : {}),
          sourceSurface: "app-field",
        }, idempotencyKey);
        const readback = await fetchFieldProductProposals(partnerId, { limit: 100, offset: 0 });
        const saved = readback.items.find((item) => item.id === proposal.id);
        if (!saved || saved.id !== proposal.id || saved.version < 1
          || saved.sourceStoreId !== proposal.sourceStoreId
          || saved.status !== proposal.status
          || saved.proposedNameAr !== proposal.proposedNameAr
          || saved.domainId !== proposal.domainId) {
          throw new Error("لم تثبت قراءة المقترح اللاحقة من الكتالوج المركزي؛ لم يُعتمد الإرسال.");
        }
        setProposals((previous) => [saved, ...previous.filter((item) => item.id !== saved.id)]);
        proposalMutationRef.current = null;
        setActionState({ kind: "idle" });
        return saved;
      } catch (error) {
        setActionState(fieldCatalogErrorState(error, "تعذر إرسال اقتراح المنتج"));
        return null;
      }
    },
    [partnerId],
  );

  const withdrawProposal = useCallback(
    async (proposalId: string, expectedVersion: number): Promise<boolean> => {
      setActionState({ kind: "submitting" });
      try {
        const proposal = await withdrawFieldProductProposal(partnerId, proposalId, expectedVersion);
        setProposals((previous) => [proposal, ...previous.filter((item) => item.id !== proposal.id)]);
        setActionState({ kind: "idle" });
        return true;
      } catch (error) {
        setActionState(fieldCatalogErrorState(error, "تعذر سحب الاقتراح"));
        return false;
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
    assortmentCommercial,
    proposals,
    reloadStore: loadStore,
    withdrawProposal,
    reloadTaxonomy: loadTaxonomy,
    searchMasterProducts,
    linkMasterProduct,
    linkMasterProductsBatch,
    proposeNewProduct,
  };
}
