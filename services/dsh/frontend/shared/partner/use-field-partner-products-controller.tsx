// Field partner products controller — trial products for a partner's
// auto-created draft store, entered by the field agent while onboarding.
// Products land in the same draft catalog control-panel/app-partner review
// later; never visible to app-client until catalog is approved.
import { useCallback, useEffect, useState } from "react";
import { fieldListPartnerProducts, fieldCreatePartnerProduct, fieldUpdatePartnerProduct } from "./partner.api";
import type { DshFieldPartnerProduct, DshFieldPartnerProductInput } from "./partner.types";

export type FieldPartnerProductsState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "success"; readonly products: readonly DshFieldPartnerProduct[] }
  | { readonly kind: "error"; readonly message: string };

export function useFieldPartnerProductsController(partnerId: string) {
  const [state, setState] = useState<FieldPartnerProductsState>({ kind: "idle" });
  const [actionState, setActionState] = useState<{ kind: "idle" | "submitting" | "error"; message?: string }>({ kind: "idle" });

  const load = useCallback(async () => {
    if (!partnerId) return;
    setState({ kind: "loading" });
    try {
      const { products } = await fieldListPartnerProducts(partnerId);
      setState({ kind: "success", products });
    } catch {
      setState({ kind: "error", message: "تعذر تحميل المنتجات" });
    }
  }, [partnerId]);

  useEffect(() => { void load(); }, [load]);

  const createProduct = useCallback(async (input: DshFieldPartnerProductInput): Promise<boolean> => {
    setActionState({ kind: "submitting" });
    try {
      await fieldCreatePartnerProduct(partnerId, input);
      setActionState({ kind: "idle" });
      void load();
      return true;
    } catch {
      setActionState({ kind: "error", message: "تعذر إضافة المنتج" });
      return false;
    }
  }, [partnerId, load]);

  const updateProduct = useCallback(async (productId: string, input: DshFieldPartnerProductInput): Promise<boolean> => {
    if (state.kind !== "success") return false;
    const existing = state.products.find((p) => p.id === productId);
    if (!existing) return false;
    setActionState({ kind: "submitting" });
    try {
      await fieldUpdatePartnerProduct(partnerId, productId, { ...input, expectedVersion: existing.version });
      setActionState({ kind: "idle" });
      void load();
      return true;
    } catch {
      setActionState({ kind: "error", message: "تعذر تحديث المنتج" });
      return false;
    }
  }, [partnerId, load, state]);

  return { state, actionState, createProduct, updateProduct, reload: load };
}
