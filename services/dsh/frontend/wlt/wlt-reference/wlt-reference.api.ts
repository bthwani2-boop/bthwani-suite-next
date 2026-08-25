import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";
import { createDshHttpClient } from "../../shared/_kernel/dsh-http-request";

export type DshReferenceApiResult<T> =
  | { readonly ok: true; readonly data: T }
  | {
      readonly ok: false;
      readonly kind: "http" | "network" | "invalid_response";
      readonly status?: number;
      readonly message: string;
    };

function referenceError(error: unknown): DshReferenceApiResult<never> {
  const value = error as {
    readonly kind?: string;
    readonly status?: number;
    readonly message?: string;
  };
  if (value.kind === "network") {
    return {
      ok: false,
      kind: "network",
      message: value.message ?? "network error",
    };
  }
  return {
    ok: false,
    kind: "http",
    ...(value.status !== undefined ? { status: value.status } : {}),
    message: value.message ?? "request failed",
  };
}

function hasReference<T>(body: unknown): body is { readonly reference: T } {
  return typeof body === "object" && body !== null && "reference" in body;
}

async function fetchReference<T>(
  baseUrl: string,
  path: string,
): Promise<DshReferenceApiResult<T>> {
  const { request } = createDshHttpClient(baseUrl, "wlt-financial-reference");
  try {
    const body = await request<unknown>(path);
    if (!hasReference<T>(body)) {
      return {
        ok: false,
        kind: "invalid_response",
        message: "financial reference envelope is invalid",
      };
    }
    return { ok: true, data: body.reference };
  } catch (error) {
    return referenceError(error);
  }
}

export function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltPaymentStatusReference>> {
  return fetchReference(
    baseUrl,
    `/dsh/control-panel/finance/references/payment-status?orderId=${encodeURIComponent(orderId)}`,
  );
}

export function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltSettlementStatusReference>> {
  return fetchReference(
    baseUrl,
    `/dsh/control-panel/finance/references/settlement-status?orderId=${encodeURIComponent(orderId)}`,
  );
}

export function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltRefundStatusReference>> {
  return fetchReference(
    baseUrl,
    `/dsh/control-panel/finance/references/refund-status?orderId=${encodeURIComponent(orderId)}`,
  );
}
