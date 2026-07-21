"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  listOperatorDeliveryPricing,
  listPartnerDeliveryPricing,
  updateOperatorDeliveryPricing,
  updatePartnerDeliveryPricing,
  type DeliveryPricingMode,
  type DeliveryPricingMutation,
  type DeliveryPricingRecord,
} from "./partner-delivery-pricing.api";

export type DeliveryPricingControllerState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "success"; readonly pricing: readonly DeliveryPricingRecord[] }
  | { readonly kind: "error"; readonly message: string };

function resolveError(error: unknown): string {
  const candidate = error as { readonly status?: number; readonly message?: string } | undefined;
  if (candidate?.status === 409) return candidate.message || "تغيرت سياسة التسعير. أعد التحميل قبل الحفظ.";
  if (candidate?.status === 403) return "لا تملك صلاحية تعديل هذه السياسة.";
  return candidate?.message || "تعذر تحميل أو حفظ سياسة التوصيل.";
}

function useDeliveryPricingBase(
  storeId: string,
  surface: "partner" | "operator",
) {
  const [state, setState] = useState<DeliveryPricingControllerState>({ kind: "loading" });
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setState({ kind: "empty" });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const response = surface === "partner"
        ? await listPartnerDeliveryPricing(storeId)
        : await listOperatorDeliveryPricing(storeId);
      setState(response.pricing.length
        ? { kind: "success", pricing: response.pricing }
        : { kind: "empty" });
      setMutationError(null);
      return true;
    } catch (error) {
      setState({ kind: "error", message: resolveError(error) });
      return false;
    }
  }, [storeId, surface]);

  useEffect(() => {
    void load();
  }, [load]);

  const records = useMemo(
    () => state.kind === "success" ? state.pricing : [],
    [state],
  );

  const save = useCallback(async (
    record: DeliveryPricingRecord,
    input: Omit<DeliveryPricingMutation, "expectedVersion">,
  ) => {
    setMutationLoading(true);
    setMutationError(null);
    try {
      if (surface === "partner") {
        await updatePartnerDeliveryPricing(storeId, {
          ...input,
          expectedVersion: record.version,
        });
      } else {
        await updateOperatorDeliveryPricing(storeId, record.fulfillmentMode, {
          ...input,
          expectedVersion: record.version,
        });
      }
      await load();
      return true;
    } catch (error) {
      setMutationError(resolveError(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [load, storeId, surface]);

  return { state, records, mutationLoading, mutationError, reload: load, save };
}

export function usePartnerDeliveryPricingController(storeId: string) {
  return useDeliveryPricingBase(storeId, "partner");
}

export function useOperatorDeliveryPricingController(storeId: string) {
  return useDeliveryPricingBase(storeId, "operator");
}

export function findDeliveryPricing(
  records: readonly DeliveryPricingRecord[],
  mode: DeliveryPricingMode,
): DeliveryPricingRecord | null {
  return records.find((record) => record.fulfillmentMode === mode) ?? null;
}
