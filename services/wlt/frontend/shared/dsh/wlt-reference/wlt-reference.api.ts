import type {
  WltPaymentStatusReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";
import {
  requestDshReference,
  type DshReferenceApiResult,
} from "../dsh-link/dsh-reference-client";

export type { DshReferenceApiResult } from "../dsh-link/dsh-reference-client";

function referencePath(kind: "payment-status" | "settlement-status" | "refund-status", orderId: string) {
  return `/dsh/control-panel/finance/references/${kind}?orderId=${encodeURIComponent(orderId)}`;
}

export function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltPaymentStatusReference>> {
  return requestDshReference<
    { readonly reference: WltPaymentStatusReference },
    WltPaymentStatusReference
  >(baseUrl, referencePath("payment-status", orderId), (response) => response.reference);
}

export function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltSettlementStatusReference>> {
  return requestDshReference<
    { readonly reference: WltSettlementStatusReference },
    WltSettlementStatusReference
  >(baseUrl, referencePath("settlement-status", orderId), (response) => response.reference);
}

export function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string,
): Promise<DshReferenceApiResult<WltRefundStatusReference>> {
  return requestDshReference<
    { readonly reference: WltRefundStatusReference },
    WltRefundStatusReference
  >(baseUrl, referencePath("refund-status", orderId), (response) => response.reference);
}
