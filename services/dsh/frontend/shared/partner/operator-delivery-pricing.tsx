import { useCallback, useEffect, useState } from "react";
import { resolveDshApiBaseUrl } from "../_kernel/dsh-api-base-url";
import { createDshHttpClient } from "../_kernel/dsh-http-request";

export type DeliveryPricingFulfillmentMode =
  | "bthwani_delivery"
  | "partner_delivery"
  | "pickup";

export type DeliveryPricingStatus = "active" | "paused" | "archived";

export type DeliveryPricingRecord = {
  readonly storeId: string;
  readonly fulfillmentMode: DeliveryPricingFulfillmentMode;
  readonly feeMinorUnits: number;
  readonly currency: string;
  readonly status: DeliveryPricingStatus;
  readonly pricingSource: "control_panel" | "partner_store" | string;
  readonly version: number;
};

export type DeliveryPricingMutationInput = {
  readonly feeMinorUnits: number;
  readonly currency: string;
  readonly status: DeliveryPricingStatus;
  readonly reason: string;
};

export type OperatorDeliveryPricingState =
  | { readonly kind: "idle" }
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | { readonly kind: "ready" }
  | { readonly kind: "error"; readonly message: string };

const { request } = createDshHttpClient(
  resolveDshApiBaseUrl(),
  "operator-delivery-pricing",
);

function isFulfillmentMode(value: unknown): value is DeliveryPricingFulfillmentMode {
  return value === "bthwani_delivery" || value === "partner_delivery" || value === "pickup";
}

function isPricingStatus(value: unknown): value is DeliveryPricingStatus {
  return value === "active" || value === "paused" || value === "archived";
}

function parseDeliveryPricingRecord(value: unknown): DeliveryPricingRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("أعاد DSH سجل تسعير توصيل غير صالح.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.storeId !== "string" ||
    !isFulfillmentMode(record.fulfillmentMode) ||
    typeof record.feeMinorUnits !== "number" ||
    !Number.isSafeInteger(record.feeMinorUnits) ||
    record.feeMinorUnits < 0 ||
    typeof record.currency !== "string" ||
    record.currency.trim() === "" ||
    !isPricingStatus(record.status) ||
    typeof record.pricingSource !== "string" ||
    !Number.isSafeInteger(record.version) ||
    Number(record.version) < 1
  ) {
    throw new Error("سجل تسعير التوصيل لا يطابق العقد التشغيلي المتوقع.");
  }
  return {
    storeId: record.storeId,
    fulfillmentMode: record.fulfillmentMode,
    feeMinorUnits: record.feeMinorUnits,
    currency: record.currency,
    status: record.status,
    pricingSource: record.pricingSource,
    version: Number(record.version),
  };
}

function resolveErrorMessage(error: unknown): string {
  const candidate = error as { readonly status?: number; readonly message?: string } | undefined;
  if (candidate?.status === 409) {
    return candidate.message || "تغيّر إصدار سياسة التسعير؛ أعد التحميل قبل الحفظ.";
  }
  if (candidate?.status === 403) return "لا تملك صلاحية إدارة تسعير التوصيل.";
  if (candidate?.status === 404) return "لم يتم العثور على سياسة تسعير التوصيل للمتجر.";
  if (candidate?.status === 400) return candidate.message || "بيانات تسعير التوصيل غير صالحة.";
  return candidate?.message || "تعذر الاتصال بخدمة تسعير التوصيل.";
}

export async function fetchOperatorDeliveryPricing(
  storeId: string,
): Promise<readonly DeliveryPricingRecord[]> {
  const response = await request<{ readonly pricing: readonly unknown[] }>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/delivery-pricing`,
  );
  if (!Array.isArray(response.pricing)) {
    throw new Error("استجابة تسعير التوصيل لا تحتوي قائمة pricing.");
  }
  return response.pricing.map(parseDeliveryPricingRecord);
}

export async function updateOperatorDeliveryPricing(
  storeId: string,
  fulfillmentMode: DeliveryPricingFulfillmentMode,
  input: DeliveryPricingMutationInput & { readonly expectedVersion: number },
): Promise<DeliveryPricingRecord> {
  const reason = input.reason.trim();
  if (
    !Number.isSafeInteger(input.feeMinorUnits) ||
    input.feeMinorUnits < 0 ||
    input.currency.trim() === "" ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 1 ||
    reason === ""
  ) {
    throw new Error("قيمة الرسم والإصدار والسبب مطلوبة لتحديث تسعير التوصيل.");
  }
  const response = await request<{ readonly pricing: unknown }>(
    `/dsh/operator/stores/${encodeURIComponent(storeId)}/delivery-pricing/${encodeURIComponent(fulfillmentMode)}`,
    {
      method: "PUT",
      body: {
        feeMinorUnits: input.feeMinorUnits,
        currency: input.currency.trim().toUpperCase(),
        status: input.status,
        expectedVersion: input.expectedVersion,
        reason,
      },
    },
  );
  return parseDeliveryPricingRecord(response.pricing);
}

export function useOperatorDeliveryPricingController(storeId: string) {
  const [records, setRecords] = useState<readonly DeliveryPricingRecord[]>([]);
  const [state, setState] = useState<OperatorDeliveryPricingState>({ kind: "idle" });
  const [mutationLoading, setMutationLoading] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const reload = useCallback(async (): Promise<boolean> => {
    const normalizedStoreId = storeId.trim();
    if (normalizedStoreId === "") {
      setRecords([]);
      setState({ kind: "empty" });
      return false;
    }
    setState({ kind: "loading" });
    try {
      const nextRecords = await fetchOperatorDeliveryPricing(normalizedStoreId);
      setRecords(nextRecords);
      setState(nextRecords.length === 0 ? { kind: "empty" } : { kind: "ready" });
      setMutationError(null);
      return true;
    } catch (error) {
      setRecords([]);
      setState({ kind: "error", message: resolveErrorMessage(error) });
      return false;
    }
  }, [storeId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const save = useCallback(async (
    current: DeliveryPricingRecord,
    input: DeliveryPricingMutationInput,
  ): Promise<boolean> => {
    if (current.storeId !== storeId) {
      setMutationError("سجل التسعير لا يتبع المتجر المحدد.");
      return false;
    }
    setMutationLoading(true);
    setMutationError(null);
    try {
      await updateOperatorDeliveryPricing(storeId, current.fulfillmentMode, {
        ...input,
        expectedVersion: current.version,
      });
      return await reload();
    } catch (error) {
      setMutationError(resolveErrorMessage(error));
      return false;
    } finally {
      setMutationLoading(false);
    }
  }, [reload, storeId]);

  return {
    state,
    records,
    mutationLoading,
    mutationError,
    reload,
    save,
  } as const;
}
