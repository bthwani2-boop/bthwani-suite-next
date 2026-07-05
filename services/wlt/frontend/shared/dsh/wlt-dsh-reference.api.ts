import type {
  WltPaymentStatusReference,
  WltDshPaymentSessionReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "./wlt-dsh-boundary.types";
import { wltFetchJson } from "./wlt-dsh-http-request";
export type { WltReferenceApiResult } from "./wlt-dsh-http-request";

export async function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltPaymentStatusReference>(
    `${baseUrl}/wlt/references/payment-status?orderId=${encodeURIComponent(orderId)}`,
    (body: any) => body.reference as WltPaymentStatusReference,
  );
}

export async function fetchWltPaymentSessionReference(
  baseUrl: string,
  paymentSessionId: string,
) {
  return wltFetchJson<WltDshPaymentSessionReference>(
    `${baseUrl}/wlt/payment-sessions/${encodeURIComponent(paymentSessionId)}`,
    (body: any) => body.paymentSession as WltDshPaymentSessionReference,
  );
}

export async function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltSettlementStatusReference>(
    `${baseUrl}/wlt/references/settlement-status?orderId=${encodeURIComponent(orderId)}`,
    (body: any) => body.reference as WltSettlementStatusReference,
  );
}

export async function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltRefundStatusReference>(
    `${baseUrl}/wlt/references/refund-status?orderId=${encodeURIComponent(orderId)}`,
    (body: any) => body.reference as WltRefundStatusReference,
  );
}
