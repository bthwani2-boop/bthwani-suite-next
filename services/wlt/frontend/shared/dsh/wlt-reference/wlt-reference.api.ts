import type {
  WltPaymentStatusReference,
  WltDshPaymentSessionReference,
  WltSettlementStatusReference,
  WltRefundStatusReference,
} from "../finance-boundary/wlt-dsh-boundary.types";
import type { WltDshReferenceContext } from "../finance-boundary/wlt-dsh-boundary.types";
import { wltFetchJson } from "../wlt-http/wlt-http-request";
export type { WltReferenceApiResult } from "../wlt-http/wlt-http-request";

export async function fetchWltPaymentStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltPaymentStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/payment-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltPaymentStatusReference,
  );
}

export async function fetchWltSettlementStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltSettlementStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/settlement-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltSettlementStatusReference,
  );
}

export async function fetchWltRefundStatusRef(
  baseUrl: string,
  orderId: string
) {
  return wltFetchJson<WltRefundStatusReference>(
    `${baseUrl}/dsh/control-panel/finance/references/refund-status?orderId=${encodeURIComponent(orderId)}`,
    (body: unknown) => (body as any).reference as WltRefundStatusReference,
  );
}
